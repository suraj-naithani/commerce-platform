import Image from "next/image";
import Link from "next/link";
import Button from "../../../components/Button";
import ProductCard from "../../../components/ProductCard";
import { products } from "../../../lib/data";

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = products.find((item) => item.id === id) || products[0];
  const relatedProducts = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);

  return (
    <div>
      <div className="grid gap-8 rounded-3xl bg-white p-8 shadow-sm lg:grid-cols-2">
        <div className="grid gap-4">
          <div className="flex h-80 items-center justify-center rounded-2xl bg-[#f3f8ee]">
            <Image src={product.image} alt={product.name} width={96} height={96} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex h-20 items-center justify-center rounded-xl bg-[#f5f9f1]">
                <Image src={product.image} alt={product.name} width={40} height={40} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-semibold text-[#2f453b]">{product.name}</h1>
          <p className="mt-2 text-xl font-semibold text-[#476556]">${product.price}</p>
          <p className="mt-4 text-[#6c8578]">{product.description}</p>
          <div className="mt-6">
            <Button>Add to cart</Button>
          </div>

          <div className="mt-8 space-y-3">
            <details open className="rounded-xl border border-[#d9e6d3] bg-[#fbfdf9] p-4">
              <summary className="cursor-pointer font-medium text-[#2f453b]">Description</summary>
              <p className="mt-2 text-sm text-[#6c8578]">{product.description}</p>
            </details>
            <details className="rounded-xl border border-[#d9e6d3] bg-[#fbfdf9] p-4">
              <summary className="cursor-pointer font-medium text-[#2f453b]">Ingredients / details</summary>
              <p className="mt-2 text-sm text-[#6c8578]">{product.ingredients}</p>
            </details>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2f453b]">Related products</h2>
          <Link href={`/category/${product.category}`} className="text-sm font-medium text-[#6f9a5f]">
            More in this category
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
