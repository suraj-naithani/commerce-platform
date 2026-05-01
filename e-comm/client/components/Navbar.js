import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Navbar({ products, categories }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#dfebd8] bg-[#f7fbf3]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#2f453b]">
            Petal Pantry
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-[#587165] md:flex">
            <Link href="/">Home</Link>
            <Link href="/category/dog-food">Categories</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/checkout">Checkout</Link>
          </nav>
        </div>
        <SearchBar products={products} categories={categories} />
      </div>
    </header>
  );
}
