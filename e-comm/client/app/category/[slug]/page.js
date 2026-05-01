import FiltersSidebar from "../../../components/FiltersSidebar";
import ProductCard from "../../../components/ProductCard";
import { categories, getCategoryName, products } from "../../../lib/data";

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const visibleProducts = products.filter((item) => item.category === slug);

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

          <div className="mt-8 flex items-center justify-center gap-2">
            <button className="rounded-lg border border-[#d2e0cb] bg-white px-3 py-2 text-sm text-[#5a7266]">1</button>
            <button className="rounded-lg border border-[#d2e0cb] bg-white px-3 py-2 text-sm text-[#5a7266]">2</button>
            <button className="rounded-lg border border-[#d2e0cb] bg-white px-3 py-2 text-sm text-[#5a7266]">3</button>
          </div>
        </div>
      </div>
    </div>
  );
}
