
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://bombaygrocers.ca";
const OUTPUT_PATH = path.resolve(__dirname, "data", "products.json");
const CONFIG_PATH = path.resolve(__dirname, "categories.config.json");

const PAGE_LIMIT = 250;
const MAX_PAGES = 1000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;
const NAV_TIMEOUT_MS = 45_000;

const CATEGORY_CONCURRENCY = Number.parseInt(process.env.CATEGORY_CONCURRENCY || "8", 10);
const FORCE_BROWSER = process.env.FORCE_BROWSER === "1";
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "20000", 10);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// ─── helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (v) => (v || "").replace(/\s+/g, " ").trim();
const stripHtml = (h) => norm(String(h || "").replace(/<[^>]*>/g, " "));

function toAbsoluteUrl(u) {
  try {
    return new URL(u, BASE_URL).toString();
  } catch {
    return null;
  }
}

function deterministicId(url, name, sku) {
  if (sku) return String(sku);
  return crypto
    .createHash("sha1")
    .update(`${url || ""}|${name || ""}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Loose title comparison key — case-insensitive, "&" ↔ "and",
 * non-alphanumerics collapsed to spaces. Lets "Snacks & Namkeen" match
 * "Snacks and Namkeen" or "Snacks  Namkeen".
 */
function titleKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function workerPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch (err) {
        console.warn(`[warn] worker error: ${err.message}`);
        out[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

// ─── HTTP (with retry/backoff) ───────────────────────────────────────────────

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json,*/*;q=0.5" },
      signal: ctrl.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonRetry(url) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchJson(url);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(RETRY_BASE_MS * attempt);
    }
  }
  throw lastErr;
}

// ─── product transform ──────────────────────────────────────────────────────

function shopifyToProduct(p, ctx) {
  const variant = p.variants && p.variants[0];
  const price = variant && variant.price != null ? Number.parseFloat(variant.price) : null;
  const sku = variant && variant.sku ? norm(String(variant.sku)) || null : null;
  const availability =
    variant?.available === true
      ? "in_stock"
      : variant?.available === false
        ? "out_of_stock"
        : "unknown";
  const images = Array.isArray(p.images)
    ? p.images.map((i) => i?.src).filter(Boolean).map(toAbsoluteUrl).filter(Boolean)
    : [];

  return {
    id: deterministicId(`${BASE_URL}/products/${p.handle}`, p.title, sku),
    name: norm(p.title || ""),
    description: stripHtml(p.body_html || ""),
    price,
    currency: "CAD",
    images,
    availability,
    category: ctx.category || "Uncategorized",
    subcategory: ctx.subcategory || "General",
  };
}

// ─── category hierarchy (from config) ────────────────────────────────────────

/**
 * Reads `categories.config.json` and returns a normalized list:
 *   [{ name, subcategories: [...] }, ...]
 * Returns null if the file is missing or invalid.
 */
function loadCategoryConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    const list = Array.isArray(raw?.categories) ? raw.categories : [];
    return list
      .map((c) => ({
        name: norm(c?.name || ""),
        subcategories: Array.isArray(c?.subcategories)
          ? c.subcategories.map(norm).filter(Boolean)
          : [],
      }))
      .filter((c) => c.name);
  } catch (err) {
    console.warn(`[warn] could not read ${CONFIG_PATH}: ${err.message}`);
    return null;
  }
}

/**
 * Merge the live navigation hierarchy with the optional manual config. Live
 * navigation wins for order and parentage; config can still add categories that
 * are not present in the menu.
 */
function mergeHierarchies(navHierarchy, configHierarchy) {
  const merged = [];
  const byParentKey = new Map();

  const addEntry = (entry) => {
    const name = norm(entry?.name || "");
    if (!name) return;

    const parentKey = titleKey(name);
    let target = byParentKey.get(parentKey);
    if (!target) {
      target = {
        name,
        handle: entry.handle || null,
        subcategories: [],
      };
      byParentKey.set(parentKey, target);
      merged.push(target);
    } else if (!target.handle && entry.handle) {
      target.handle = entry.handle;
    }

    const seenSubs = new Set(target.subcategories.map((s) => titleKey(s.name)));
    for (const rawSub of entry.subcategories || []) {
      const sub =
        typeof rawSub === "string"
          ? { name: norm(rawSub), handle: null }
          : { name: norm(rawSub?.name || ""), handle: rawSub?.handle || null };
      if (!sub.name) continue;

      const subKey = titleKey(sub.name);
      if (seenSubs.has(subKey)) continue;
      seenSubs.add(subKey);
      target.subcategories.push(sub);
    }
  };

  for (const entry of navHierarchy || []) addEntry(entry);
  for (const entry of configHierarchy || []) addEntry(entry);

  return merged;
}

/**
 * Apply a hierarchy onto the flat list of collections.
 *
 * For each (parent, child) pair: find the collection whose title matches
 * `child` (handle first, loose title match second) and tag:
 *   collection.category    = parent.name
 *   collection.subcategory = child
 *
 * Sorts categories so children are processed BEFORE parents — when products
 * are deduped by id, the child tagging wins (so a product in
 * /collections/restaurant + /collections/bread ends up tagged "Restaurant >
 * Bread", not "Restaurant > Restaurant").
 *
 * Returns an index used to order the final output blocks by hierarchy order.
 */
function applyHierarchy(categories, hierarchy) {
  const byTitleKey = new Map();
  const byHandle = new Map();
  for (const c of categories) {
    byTitleKey.set(titleKey(c.title), c);
    if (c.handle) byHandle.set(c.handle, c);
  }

  const findCollection = (item) => {
    if (item?.handle && byHandle.has(item.handle)) return byHandle.get(item.handle);
    return byTitleKey.get(titleKey(item?.name || item));
  };

  const catIndex = new Map();
  const subIndex = new Map();
  let mapped = 0;

  hierarchy.forEach((entry, i) => {
    catIndex.set(entry.name, i);

    entry.subcategories.forEach((sub, j) => {
      const subTitle = typeof sub === "string" ? sub : sub.name;
      subIndex.set(`${entry.name}|||${subTitle}`, j);
      const c = findCollection(sub);
      if (!c) return;
      c.category = entry.name;
      c.subcategory = subTitle;
      c.__role = "child";
      c.__catIdx = i;
      c.__subIdx = j;
      mapped++;
    });

    // The parent collection (e.g. /collections/restaurant) is processed last
    // so its products only land under "Restaurant > Restaurant" if they weren't
    // already covered by a child collection.
    const parentCol = findCollection(entry);
    if (parentCol && parentCol.__role !== "child") {
      parentCol.category = entry.name;
      parentCol.subcategory = entry.name;
      parentCol.__role = "parent";
      parentCol.__catIdx = i;
    }
  });

  const roleRank = { child: 0, other: 1, parent: 2 };
  categories.sort((a, b) => {
    const r = roleRank[a.__role || "other"] - roleRank[b.__role || "other"];
    if (r !== 0) return r;
    const ci = (a.__catIdx ?? 999) - (b.__catIdx ?? 999);
    if (ci !== 0) return ci;
    return (a.__subIdx ?? 999) - (b.__subIdx ?? 999);
  });

  console.log(
    `[info] Hierarchy: mapped ${mapped} subcategories under ${hierarchy.length} parent categories`
  );
  return { catIndex, subIndex };
}

/**
 * Group products by (category, subcategory). Output blocks are ordered by
 * config — Restaurant first, its subcategories in declared order, then
 * Snacks & Namkeen, etc. Anything not in config goes to the end alphabetically.
 */
function groupByCategory(products, sortInfo) {
  const groups = new Map();
  for (const p of products) {
    const key = `${p.category}|||${p.subcategory}`;
    if (!groups.has(key)) {
      groups.set(key, { category: p.category, subcategory: p.subcategory, products: [] });
    }
    groups.get(key).products.push({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      images: p.images,
      availability: p.availability,
    });
  }

  const blocks = [...groups.values()];
  if (!sortInfo) {
    return blocks.sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      return c !== 0 ? c : a.subcategory.localeCompare(b.subcategory);
    });
  }

  const { catIndex, subIndex } = sortInfo;
  const rank = (cat, sub) => {
    const ci = catIndex.get(cat) ?? 999;
    const si = subIndex.get(`${cat}|||${sub}`) ?? 999;
    return [ci, si];
  };

  return blocks.sort((a, b) => {
    const [ac, as] = rank(a.category, a.subcategory);
    const [bc, bs] = rank(b.category, b.subcategory);
    if (ac !== bc) return ac - bc;
    if (as !== bs) return as - bs;
    return a.subcategory.localeCompare(b.subcategory);
  });
}

// ─── Puppeteer setup ─────────────────────────────────────────────────────────

async function newLightPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const t = req.resourceType();
    if (t === "image" || t === "stylesheet" || t === "font" || t === "media") req.abort();
    else req.continue();
  });
  return page;
}

// ─── flat list of collections ────────────────────────────────────────────────

async function listCollectionsViaJson() {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchJsonRetry(
      `${BASE_URL}/collections.json?limit=${PAGE_LIMIT}&page=${page}`
    );
    if (!data?.collections?.length) break;
    for (const c of data.collections) {
      if (!c.handle || c.handle === "all" || c.handle === "frontpage") continue;
      out.push({
        handle: c.handle,
        title: norm(c.title),
        url: `${BASE_URL}/collections/${c.handle}`,
        category: norm(c.title),
        subcategory: norm(c.title),
      });
    }
    if (data.collections.length < PAGE_LIMIT) break;
  }
  return out;
}

async function listCollectionsViaBrowser(browser) {
  const page = await newLightPage(browser);
  try {
    await page.goto(`${BASE_URL}/collections/all`, { waitUntil: "domcontentloaded" });
    return await page.evaluate((base) => {
      const out = new Map();
      for (const a of document.querySelectorAll('a[href*="/collections/"]')) {
        const m = (a.getAttribute("href") || "").match(/\/collections\/([^/?#]+)/);
        if (!m) continue;
        const handle = m[1];
        if (handle === "all" || handle === "frontpage") continue;
        const title = (a.textContent || "").replace(/\s+/g, " ").trim();
        if (!title) continue;
        if (!out.has(handle)) {
          out.set(handle, {
            handle,
            title,
            url: `${base}/collections/${handle}`,
            category: title,
            subcategory: title,
          });
        }
      }
      return [...out.values()];
    }, BASE_URL);
  } finally {
    await page.close().catch(() => { });
  }
}

// ─── products via Shopify JSON ───────────────────────────────────────────────

async function listNavigationHierarchyViaBrowser(browser) {
  const page = await newLightPage(browser);
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    return await page.evaluate(() => {
      const nav = document.querySelector("nav.menu--secondary") || document.querySelector("header nav");
      if (!nav) return [];

      const normText = (v) => (v || "").replace(/\s+/g, " ").trim();
      const collectionFromLink = (a) => {
        const href = a?.getAttribute("href") || "";
        const match = href.match(/\/collections\/([^/?#]+)/);
        if (!match) return null;
        const name = normText(a.textContent);
        if (!name) return null;
        return { name, handle: match[1] };
      };

      const rows = [];
      const parentItems = nav.querySelectorAll(
        ".menu__level-02 .menu__item--has-children, .menu__level-02 .menu__item"
      );

      for (const item of parentItems) {
        const parent = collectionFromLink(
          item.querySelector(":scope > a.menu__title[href*='/collections/']")
        );
        if (!parent) continue;

        const subcategories = [];
        const seen = new Set([parent.handle]);
        const childLinks = item.querySelectorAll(":scope .menu__level-03 a[href*='/collections/']");

        for (const link of childLinks) {
          const child = collectionFromLink(link);
          if (!child || seen.has(child.handle)) continue;
          seen.add(child.handle);
          subcategories.push(child);
        }

        rows.push({ ...parent, subcategories });
      }

      return rows;
    });
  } finally {
    await page.close().catch(() => { });
  }
}

async function getProductsViaJson(cat) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchJsonRetry(
      `${BASE_URL}/collections/${cat.handle}/products.json?limit=${PAGE_LIMIT}&page=${page}`
    );
    if (!data || !Array.isArray(data.products)) {
      if (page === 1) return null; // signal failure → caller tries the browser path
      break;
    }
    if (data.products.length === 0) break;
    for (const p of data.products) out.push(shopifyToProduct(p, cat));
    if (data.products.length < PAGE_LIMIT) break;
  }
  return out;
}

// ─── browser fallback for products (rarely used) ─────────────────────────────

async function getProductLinksViaBrowser(browser, categoryUrl) {
  const all = new Set();
  const seen = new Set();
  let cur = categoryUrl;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const page = await newLightPage(browser);
    try {
      await page.goto(cur, { waitUntil: "domcontentloaded" });
      const data = await page.evaluate((base) => {
        const toAbs = (h) => {
          try {
            return new URL(h, base).toString();
          } catch {
            return null;
          }
        };
        const links = new Set();
        for (const a of document.querySelectorAll('a[href*="/products/"]')) {
          const u = toAbs(a.getAttribute("href"));
          if (u) links.add(u.split("?")[0]);
        }
        const next = document.querySelector(
          'a[rel="next"], a.next, a.pagination__next, a[aria-label*="Next"]'
        );
        return { products: [...links], next: next ? toAbs(next.getAttribute("href")) : null };
      }, BASE_URL);
      data.products.forEach((u) => all.add(u));
      cur = data.next;
    } finally {
      await page.close().catch(() => { });
    }
  }
  return [...all];
}

async function scrapeProductViaBrowser(browser, url, ctx) {
  const page = await newLightPage(browser);
  let ld;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    ld = await page.evaluate(() => {
      for (const b of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(b.textContent || "");
          for (const it of Array.isArray(data) ? data : [data]) {
            const t = Array.isArray(it["@type"]) ? it["@type"] : [it["@type"]];
            if (t.includes("Product")) return it;
          }
        } catch { }
      }
      return null;
    });
  } finally {
    await page.close().catch(() => { });
  }
  if (!ld) return null;

  const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  const price = offer ? Number.parseFloat(offer.price ?? offer.lowPrice) : null;
  const availability = String(offer?.availability ?? "")
    .toLowerCase()
    .includes("outofstock")
    ? "out_of_stock"
    : "in_stock";
  const images = Array.isArray(ld.image) ? ld.image : ld.image ? [ld.image] : [];

  return {
    id: deterministicId(url, ld.name, ld.sku),
    name: norm(ld.name || ""),
    description: stripHtml(ld.description || ""),
    price: Number.isFinite(price) ? price : null,
    currency: offer?.priceCurrency || "CAD",
    images: images.map(toAbsoluteUrl).filter(Boolean),
    availability,
    category: ctx.category || "Uncategorized",
    subcategory: ctx.subcategory || "General",
  };
}

async function getProductsViaBrowser(browser, cat) {
  const links = await getProductLinksViaBrowser(browser, cat.url);
  const conc = Math.max(2, Math.floor(CATEGORY_CONCURRENCY / 2));
  const products = await workerPool(links, conc, (url) =>
    scrapeProductViaBrowser(browser, url, cat).catch(() => null)
  );
  return products.filter((p) => p && p.name);
}

// ─── orchestration ───────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();

  // 1. Load explicit category hierarchy
  const config = loadCategoryConfig();
  if (config) {
    console.log(
      `[info] Loaded ${config.length} parent categories from ${path.basename(CONFIG_PATH)}`
    );
  } else {
    console.warn(
      `[warn] ${path.basename(CONFIG_PATH)} not found — categories will be flat. ` +
      "Create it to map subcategories under their parents."
    );
  }

  // 2. Flat list of collections (JSON, with browser fallback)
  console.log("[info] Listing collections via /collections.json …");
  let categories = await listCollectionsViaJson().catch((err) => {
    console.warn(`[warn] /collections.json failed: ${err.message}`);
    return [];
  });
  console.log(`[info] Found ${categories.length} collections via JSON`);

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let browserFallbacks = 0;
  try {
    if (categories.length === 0) {
      categories = await listCollectionsViaBrowser(browser);
      console.log(`[info] Browser fallback: ${categories.length} collections`);
    }

    // 3. Apply the live site hierarchy, with config as a fallback/extension.
    let navHierarchy = [];
    try {
      navHierarchy = await listNavigationHierarchyViaBrowser(browser);
      console.log(`[info] Found ${navHierarchy.length} parent categories in live navigation`);
    } catch (err) {
      console.warn(`[warn] live navigation hierarchy failed: ${err.message}`);
    }
    const hierarchy = mergeHierarchies(navHierarchy, config);
    const sortInfo = hierarchy.length ? applyHierarchy(categories, hierarchy) : null;

    // 4. Fetch products from each collection in parallel
    console.log(
      `[info] Fetching products from ${categories.length} collections (concurrency=${CATEGORY_CONCURRENCY})`
    );
    const results = await workerPool(categories, CATEGORY_CONCURRENCY, async (cat, i) => {
      let products = null;
      if (!FORCE_BROWSER) {
        try {
          products = await getProductsViaJson(cat);
        } catch (err) {
          console.warn(`[warn] JSON ${cat.handle}: ${err.message}`);
        }
      }
      if (products === null) {
        browserFallbacks++;
        products = await getProductsViaBrowser(browser, cat);
      }
      console.log(
        `[done ${i + 1}/${categories.length}] ${cat.category} > ${cat.subcategory}: ${products.length}`
      );
      return products;
    });

    // 5. Dedupe by product id (children come first → child tagging wins)
    const byId = new Map();
    for (const arr of results) {
      if (!Array.isArray(arr)) continue;
      for (const p of arr) {
        if (p && p.id && !byId.has(p.id)) byId.set(p.id, p);
      }
    }

    // 6. Group + write
    const grouped = groupByCategory([...byId.values()], sortInfo);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(grouped, null, 2), "utf8");

    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[done] ${OUTPUT_PATH} — ${byId.size} unique products in ${grouped.length} blocks (${dt}s, ` +
      `browser fallbacks: ${browserFallbacks})`
    );
  } finally {
    await browser.close().catch(() => { });
  }
}

main().catch((err) => {
  console.error("[fatal] Scraper failed:", err);
  process.exit(1);
});