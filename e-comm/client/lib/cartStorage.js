const CART_KEY = "cart_items_v1";
const CART_TTL_DAYS = 7;
const CART_EVENT = "cart-updated";

function getExpiryTimestamp() {
  return Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function readCartPayload() {
  if (typeof window === "undefined") return { items: [], expiresAt: 0 };

  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], expiresAt: 0 };

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items) || typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(CART_KEY);
      return { items: [], expiresAt: 0 };
    }

    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(CART_KEY);
      return { items: [], expiresAt: 0 };
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(CART_KEY);
    return { items: [], expiresAt: 0 };
  }
}

function writeCartItems(items) {
  if (typeof window === "undefined") return;

  const payload = {
    items,
    expiresAt: getExpiryTimestamp(),
  };
  window.localStorage.setItem(CART_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCartItems() {
  return readCartPayload().items;
}

export function setCartItems(items) {
  writeCartItems(Array.isArray(items) ? items : []);
}

export function subscribeCart(listener) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", listener);
  window.addEventListener(CART_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CART_EVENT, listener);
  };
}
