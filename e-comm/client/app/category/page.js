"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import FiltersSidebar from "../../components/FiltersSidebar";
import ProductCard from "../../components/ProductCard";
import { categories } from "../../lib/data";
import { useGetProductCategoriesQuery, useGetProductsQuery } from "../../redux/api/productApi";

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [1];
  if (currentPage > 3) pages.push("...");
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) pages.push(page);
  if (currentPage < totalPages - 2) pages.push("...");
  pages.push(totalPages);

  return pages;
}

export default function CategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
  const selectedCategory = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "";
  const currentPage = Number.isNaN(pageParam) ? 1 : Math.max(pageParam, 1);
  const pageSize = 6;

  const { data, isLoading, isError } = useGetProductsQuery({
    page: currentPage,
    limit: pageSize,
    category: selectedCategory,
    sort,
  });
  const { data: categoryResponse } = useGetProductCategoriesQuery();

  const filterCategories = categoryResponse?.data || categories.map((item) => item.name);
  const mappedProducts = useMemo(
    () =>
      ((Array.isArray(data) ? data : data?.data) || []).map((item, index) => ({
        ...item,
        id: String(item.id),
        category: item.category || categories[index % categories.length].id,
        image: item.images?.[0] || item.image || "/file.svg",
      })),
    [data],
  );

  const totalPages = data?.pagination?.totalPages || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = buildPagination(safeCurrentPage, totalPages);

  const updateFilters = (updates) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) nextParams.delete(key);
      else nextParams.set(key, String(value));
    });
    if (!Object.prototype.hasOwnProperty.call(updates, "page")) nextParams.set("page", "1");

    router.push(`/category?${nextParams.toString()}`);
  };

  const buildPageHref = (page) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("page", String(page));
    return `/category?${nextParams.toString()}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-[#2f453b]">Categories</h1>
      <p className="mt-2 text-[#6e877a]">Browse curated products with soft filtering and clean pagination UI.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <FiltersSidebar
          categories={filterCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={(value) => updateFilters({ category: value })}
        />

        <div>
          {isLoading && <p className="mb-4 text-sm text-[#6e877a]">Loading products...</p>}
          {isError && <p className="mb-4 text-sm text-[#b75f5f]">Unable to load products.</p>}

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#5d7468]">Showing {data?.pagination?.total || 0} products</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#4e675b]">Sort:</span>
              <select
                value={sort}
                onChange={(event) => updateFilters({ sort: event.target.value })}
                className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm text-[#4f675b]"
              >
                <option value="">Featured</option>
                <option value="asc">Price, low to high</option>
                <option value="desc">Price, high to low</option>
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mappedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {!isLoading && !isError && mappedProducts.length === 0 && (
            <p className="mt-4 text-sm text-[#6e877a]">No products available right now.</p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={buildPageHref(Math.max(1, safeCurrentPage - 1))}
              aria-label="Previous page"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                safeCurrentPage === 1
                  ? "pointer-events-none border border-[#e1eadc] bg-[#f5f8f2] text-[#9eb0a6]"
                  : "border border-[#d2e0cb] bg-white text-[#4e675b] hover:bg-[#f3f8ee]"
              }`}
            >
              <FaAnglesLeft aria-hidden="true" />
            </Link>

            {pageNumbers.map((pageNumber, index) =>
              pageNumber === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-[#8ba095]">
                  ...
                </span>
              ) : (
                <Link
                  key={pageNumber}
                  href={buildPageHref(pageNumber)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    pageNumber === safeCurrentPage
                      ? "bg-[#6f9a5f] text-white shadow-sm"
                      : "border border-[#d2e0cb] bg-white text-[#4e675b] hover:bg-[#f3f8ee]"
                  }`}
                >
                  {pageNumber}
                </Link>
              ),
            )}

            <Link
              href={buildPageHref(Math.min(totalPages, safeCurrentPage + 1))}
              aria-label="Next page"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                safeCurrentPage === totalPages
                  ? "pointer-events-none border border-[#e1eadc] bg-[#f5f8f2] text-[#9eb0a6]"
                  : "border border-[#d2e0cb] bg-white text-[#4e675b] hover:bg-[#f3f8ee]"
              }`}
            >
              <FaAnglesRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
