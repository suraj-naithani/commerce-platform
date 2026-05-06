"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "../../../components/Spinner";
import Button from "../../../components/Button";
import { merchantApiFetch } from "../../../lib/merchantApi";
import { getMerchantToken } from "../../../lib/merchantAuth";
import { useRouter } from "next/navigation";

export default function SellerProductsPage() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    error: "",
    products: [],
    pagination: { limit: 50, offset: 0, total: 0 },
    isClaiming: false,
  });

  useEffect(() => {
    if (!getMerchantToken()) router.push("/seller/login");
  }, [router]);

  const loadProducts = async ({ limit, offset } = {}) => {
    const nextLimit = typeof limit === "number" ? limit : state.pagination.limit;
    const nextOffset = typeof offset === "number" ? offset : state.pagination.offset;

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    const { response, data } = await merchantApiFetch(
      `/api/merchants/me/products?limit=${nextLimit}&offset=${nextOffset}`,
    );
    if (!response.ok) throw new Error(data?.message || "Failed to load products");

    setState((prev) => ({
      ...prev,
      loading: false,
      error: "",
      products: data?.data || [],
      pagination: data?.pagination || { limit: nextLimit, offset: nextOffset, total: 0 },
    }));
  };

  useEffect(() => {
    let active = true;
    loadProducts()
      .catch((e) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: e.message || "Failed to load products",
          products: [],
        }));
      })
      .finally(() => {
        // no-op; state handled above
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const products = useMemo(() => state.products || [], [state.products]);
  const pagination = state.pagination || { limit: 50, offset: 0, total: 0 };
  const start = pagination.total === 0 ? 0 : pagination.offset + 1;
  const end = Math.min(pagination.total || 0, pagination.offset + products.length);
  const hasPrev = pagination.offset > 0;
  const hasNext = pagination.offset + pagination.limit < (pagination.total || 0);

  if (state.loading) return <Spinner label="Loading products..." />;

  if (state.error) {
    return (
      <section className="rounded-2xl border border-[#f0d4d4] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#a94f4f]">Products error</h1>
        <p className="mt-3 text-sm text-[#6f867a]">{state.error}</p>
        <Link href="/seller/dashboard" className="mt-5 inline-block">
          <Button>Back to dashboard</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2f453b]">Products</h1>
          <p className="mt-1 text-sm text-[#6e877a]">
            Showing {start}-{end} of {pagination.total}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={state.isClaiming}
            onClick={async () => {
              try {
                setState((prev) => ({ ...prev, isClaiming: true }));
                const { response } = await merchantApiFetch("/api/merchants/me/products/claim-unassigned", {
                  method: "POST",
                });
                if (!response.ok) throw new Error("Failed to claim unassigned products");
                await loadProducts({ limit: pagination.limit, offset: 0 });
              } catch (e) {
                setState((prev) => ({ ...prev, error: e.message || "Failed to claim products" }));
              } finally {
                setState((prev) => ({ ...prev, isClaiming: false }));
              }
            }}
            className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef] disabled:opacity-60"
          >
            {state.isClaiming ? "Claiming..." : "Claim unassigned products"}
          </button>
          <Link href="/seller/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-[#6e877a]">No products assigned to this merchant.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2ebdd] text-xs uppercase tracking-wide text-[#6e877a]">
                <th className="py-3 pr-3">ID</th>
                <th className="py-3 pr-3">Name</th>
                <th className="py-3 pr-3">Category</th>
                <th className="py-3 pr-3">Subcategory</th>
                <th className="py-3 pr-3">Price</th>
                <th className="py-3">Availability</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[#f0f6eb] text-[#365242]">
                  <td className="py-3 pr-3 font-mono text-xs">{p.id}</td>
                  <td className="py-3 pr-3">{p.name || "-"}</td>
                  <td className="py-3 pr-3">{p.category}</td>
                  <td className="py-3 pr-3">{p.subcategory}</td>
                  <td className="py-3 pr-3">{typeof p.price === "number" ? `$${p.price.toFixed(2)}` : "-"}</td>
                  <td className="py-3">{p.availability || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => loadProducts({ limit: pagination.limit, offset: Math.max(0, pagination.offset - pagination.limit) })}
          className="rounded-xl border border-[#d6e3cf] bg-white px-4 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef] disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => loadProducts({ limit: pagination.limit, offset: pagination.offset + pagination.limit })}
          className="rounded-xl border border-[#d6e3cf] bg-white px-4 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}

