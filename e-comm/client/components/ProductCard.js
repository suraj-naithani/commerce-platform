import Image from "next/image";
import Link from "next/link";
import Button from "./Button";

export default function ProductCard({ product }) {
  return (
    <article className="rounded-2xl border border-[#e2ebdd] bg-white p-4 shadow-sm">
      <Link href={`/product/${product.id}`} className="block">
        <div className="mb-4 flex h-44 items-center justify-center rounded-xl bg-[#f4f8ef]">
          <Image src={product.image} alt={product.name} width={72} height={72} />
        </div>
        <h3 className="text-lg font-semibold text-[#2d4339]">{product.name}</h3>
      </Link>
      <p className="mt-1 text-sm text-[#7d9388]">{product.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-semibold text-[#395648]">${product.price}</span>
        <Button className="px-4 py-2 text-xs">Add to cart</Button>
      </div>
    </article>
  );
}
