import Link from "next/link";
import Button from "./Button";

export default function ProductCard({ product }) {
  const imageSrc = product.image || "/file.svg";
  const description = product.description || "Premium pet nutrition crafted for daily wellness.";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e2ebdd] bg-white p-4 shadow-sm">
      <Link href={`/product/${product.id}`} className="block">
        <div className="mb-4 flex h-44 items-center justify-center rounded-xl bg-[#f4f8ef] p-3">
          <img src={imageSrc} alt={product.name} className="h-full w-full object-contain" />
        </div>
        <h3 className="text-lg font-semibold text-[#2d4339]">{product.name}</h3>
      </Link>
      <div className="mt-1 flex flex-1 flex-col justify-between">
        <p className="line-clamp-2 text-sm text-[#7d9388]">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-base font-semibold text-[#395648]">${product.price ?? 0}</span>
          <Button className="px-4 py-2 text-xs">Add to cart</Button>
        </div>
      </div>
    </article>
  );
}
