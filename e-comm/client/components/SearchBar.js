"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useSearchProductsQuery } from "../redux/api/productApi";
import Input from "./Input";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 120);
  const trimmedQuery = debouncedQuery.trim();
  const shouldSearch = trimmedQuery.length >= 2;
  const { data } = useSearchProductsQuery(
    { q: trimmedQuery, size: 8 },
    { skip: !shouldSearch },
  );

  const suggestions = useMemo(() => {
    const products = data?.data || [];
    const productMatches = products.slice(0, 5);
    const categoryMatches = [...new Set(products.map((item) => item.category).filter(Boolean))].slice(0, 3);
    return { products: productMatches, categories: categoryMatches };
  }, [data]);

  const showDropdown = query.trim().length > 0;

  return (
    <div className="relative w-full max-w-lg">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products or categories..."
      />

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-[#dbe7d4] bg-white p-3 shadow-lg">
          {!shouldSearch ? (
            <p className="text-sm text-[#90a498]">Type at least 2 characters to search.</p>
          ) : (
            <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#789083]">Products</p>
          {suggestions.products.length === 0 ? (
            <p className="mb-3 text-sm text-[#90a498]">No product suggestion</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {suggestions.products.map((item) => (
                <li key={item.id}>
                  <Link className="text-sm text-[#2f453b] hover:text-[#6f9a5f]" href={`/product/${item.id}`}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#789083]">Categories</p>
          {suggestions.categories.length === 0 ? (
            <p className="text-sm text-[#90a498]">No category suggestion</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.categories.map((item) => (
                <li key={item}>
                  <Link className="text-sm text-[#2f453b] hover:text-[#6f9a5f]" href={`/category?category=${encodeURIComponent(item)}&page=1`}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
