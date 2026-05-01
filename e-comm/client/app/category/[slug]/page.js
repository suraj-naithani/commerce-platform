import Link from "next/link";
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import FiltersSidebar from "../../../components/FiltersSidebar";
import ProductCard from "../../../components/ProductCard";
import { categories, getCategoryName, products } from "../../../lib/data";

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const pageParam = Number.parseInt(resolvedSearchParams?.page || "1", 10);
  const allCategoryProducts = products.filter((item) => item.category === slug);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(allCategoryProducts.length / pageSize));
  const currentPage = Number.isNaN(pageParam) ? 1 : Math.min(Math.max(pageParam, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleProducts = allCategoryProducts.slice(startIndex, startIndex + pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-[#2f453b]">{getCategoryName(slug)}</h1>
      <p className="mt-2 text-[#6e877a]">Browse curated products with soft filtering and clean pagination UI.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <FiltersSidebar categories={categories} />

        <div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={`/category/${slug}?page=${Math.max(1, currentPage - 1)}`}
              aria-label="Previous page"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                currentPage === 1
                  ? "pointer-events-none border border-[#e1eadc] bg-[#f5f8f2] text-[#9eb0a6]"
                  : "border border-[#d2e0cb] bg-white text-[#4e675b] hover:bg-[#f3f8ee]"
              }`}
            >
              <FaAnglesLeft aria-hidden="true" />
            </Link>

            {pageNumbers.map((pageNumber) => (
              <Link
                key={pageNumber}
                href={`/category/${slug}?page=${pageNumber}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  pageNumber === currentPage
                    ? "bg-[#6f9a5f] text-white shadow-sm"
                    : "border border-[#d2e0cb] bg-white text-[#4e675b] hover:bg-[#f3f8ee]"
                }`}
              >
                {pageNumber}
              </Link>
            ))}

            <Link
              href={`/category/${slug}?page=${Math.min(totalPages, currentPage + 1)}`}
              aria-label="Next page"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                currentPage === totalPages
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
