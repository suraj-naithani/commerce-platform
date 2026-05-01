import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import Button from "../components/Button";
import CategoryCard from "../components/CategoryCard";
import ProductCard from "../components/ProductCard";
import { categories, products, testimonials } from "../lib/data";

const TestimonialsSection = dynamic(() => import("../components/TestimonialsSection"));

export default function Home() {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-2 md:p-12">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#6f9a5f]">Fresh pet nutrition</p>
          <h1 className="text-4xl font-semibold leading-tight text-[#2f453b] md:text-5xl">
            Soft, healthy meals for happier pets every day.
          </h1>
          <p className="mt-4 max-w-md text-[#6c8578]">
            Premium ingredients, transparent nutrition, and simple delivery.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/category/dog-food">
              <Button>Shop now</Button>
            </Link>
            <Link href="/category/cat-food">
              <Button variant="secondary">Explore categories</Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {products.slice(0, 4).map((item) => (
            <div key={item.id} className="flex h-32 items-center justify-center rounded-2xl bg-[#f3f8ee]">
              <Image src={item.image} alt={item.name} width={54} height={54} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-[#2f453b]">Featured categories</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[#2f453b]">Featured products</h2>
          <Link href="/category/dog-food" className="text-sm font-medium text-[#6f9a5f]">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <TestimonialsSection testimonials={testimonials} />

      <section className="rounded-3xl bg-[#e8f3df] p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-[#5f8750]">Weekly offers</p>
        <h3 className="mt-2 text-2xl font-semibold text-[#2f453b]">Get 20% off on your first subscription order.</h3>
        <p className="mt-3 max-w-xl text-[#688074]">
          Join the pantry club and receive fresh bundles every month with flexible pausing.
        </p>
      </section>
    </div>
  );
}
