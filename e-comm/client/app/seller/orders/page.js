"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Spinner from "../../../components/Spinner";
import Button from "../../../components/Button";
import { merchantApiFetch } from "../../../lib/merchantApi";
import { getMerchantToken } from "../../../lib/merchantAuth";
import { useRouter } from "next/navigation";

function formatMoney(cents) {
  const amount = Number(cents || 0) / 100;
  return `$${amount.toFixed(2)}`;
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: "", orders: [] });

  useEffect(() => {
    if (!getMerchantToken()) router.push("/seller/login");
  }, [router]);

  useEffect(() => {
    let active = true;
    merchantApiFetch("/api/merchants/me/orders?limit=100")
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data?.message || "Failed to load orders");
        setState({ loading: false, error: "", orders: data?.data || [] });
      })
      .catch((e) => {
        if (!active) return;
        setState({ loading: false, error: e.message || "Failed to load orders", orders: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  const orders = useMemo(() => state.orders || [], [state.orders]);

  if (state.loading) return <Spinner label="Loading orders..." />;

  if (state.error) {
    return (
      <section className="rounded-2xl border border-[#f0d4d4] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#a94f4f]">Orders error</h1>
        <p className="mt-3 text-sm text-[#6f867a]">{state.error}</p>
        <Link href="/seller/dashboard" className="mt-5 inline-block">
          <Button>Back to dashboard</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#2f453b]">Orders</h1>
        <Link href="/seller/dashboard">
          <Button variant="secondary">Dashboard</Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-[#6e877a]">No orders yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2ebdd] text-xs uppercase tracking-wide text-[#6e877a]">
                <th className="py-3 pr-3">Order</th>
                <th className="py-3 pr-3">Total</th>
                <th className="py-3 pr-3">Platform fee</th>
                <th className="py-3 pr-3">Seller gets</th>
                <th className="py-3 pr-3">Stripe session</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[#f0f6eb] text-[#365242]">
                  <td className="py-3 pr-3 font-mono">#{o.id}</td>
                  <td className="py-3 pr-3">{formatMoney(o.total_amount_cents)}</td>
                  <td className="py-3 pr-3">{formatMoney(o.platform_fee_cents)}</td>
                  <td className="py-3 pr-3">{formatMoney(o.merchant_amount_cents)}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{o.stripe_checkout_session_id || "-"}</td>
                  <td className="py-3 pr-3">{String(o.status || "").toLowerCase()}</td>
                  <td className="py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

