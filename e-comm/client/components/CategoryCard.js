import Link from "next/link";

export default function CategoryCard({ category }) {
  return (
    <Link
      href={`/category/${category.id}`}
      className="rounded-2xl border border-[#dfe9d8] bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-[#2f453b]">{category.name}</h3>
      <p className="mt-2 text-sm text-[#789083]">{category.description}</p>
    </Link>
  );
}
