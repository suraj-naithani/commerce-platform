"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import SearchBar from "./SearchBar";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/seller")) return null;

  const cartItems = useSelector((state) => state.cart.items);
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfebd8] bg-[#f7fbf3]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#2f453b]">
            CartNest
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-[#587165] md:flex">
            <Link href="/">Home</Link>
            <Link href="/category">Categories</Link>
            <Link href="/cart" className="relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e35d5d] px-1 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
