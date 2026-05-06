"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { setMerchantToken } from "../lib/merchantAuth";

export default function SellerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/seller/dashboard", label: "Dashboard" },
    { href: "/seller/orders", label: "Orders" },
    { href: "/seller/products", label: "Products" },
  ];

  const handleLogout = () => {
    setMerchantToken("");
    router.push("/seller/login");
  };

  return (
    <div className="mb-6 rounded-2xl border border-[#dbe7d4] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/seller/dashboard" className="text-sm font-semibold text-[#2f453b]">
            Seller
          </Link>
          <div className="hidden h-4 w-px bg-[#e2ebdd] sm:block" />
          <nav className="flex flex-wrap gap-3 text-sm text-[#587165]">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} className={active ? "font-semibold text-[#2f453b]" : ""}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-xl border border-[#d6e3cf] bg-white px-4 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

