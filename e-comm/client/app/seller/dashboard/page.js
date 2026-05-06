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

function StatusBadge({ status }) {
  const s = String(status || "pending").toLowerCase();
  const styles =
    s === "verified"
      ? "bg-[#e8f3df] text-[#2f453b] border-[#cfe3c4]"
      : s === "restricted"
        ? "bg-[#fff4db] text-[#6b4c00] border-[#f0dba8]"
        : s === "failed"
          ? "bg-[#fbe7e7] text-[#8d2a2a] border-[#f0caca]"
          : "bg-[#eef4ff] text-[#214a8b] border-[#cddbf5]";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>{s}</span>;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [stripeActionMessage, setStripeActionMessage] = useState("");

  useEffect(() => {
    if (!getMerchantToken()) router.push("/seller/login");
  }, [router]);

  useEffect(() => {
    let active = true;
    merchantApiFetch("/api/merchants/me/dashboard")
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data?.message || "Failed to load dashboard");
        setState({ loading: false, error: "", data });
      })
      .catch((e) => {
        if (!active) return;
        setState({ loading: false, error: e.message || "Failed to load dashboard", data: null });
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = state.data?.summary;
  const merchant = state.data?.merchant;
  const recentOrders = useMemo(() => state.data?.recent_orders || [], [state.data]);

  if (state.loading) return <Spinner label="Loading seller dashboard..." />;

  if (state.error) {
    return (
      <section className="rounded-2xl border border-[#f0d4d4] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#a94f4f]">Dashboard error</h1>
        <p className="mt-3 text-sm text-[#6f867a]">{state.error}</p>
        <Link href="/seller/login" className="mt-5 inline-block">
          <Button>Back to login</Button>
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#2f453b]">{merchant?.name || "Seller dashboard"}</h1>
            <p className="mt-1 text-sm text-[#6e877a]">{merchant?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={merchant?.verification_status} />
            <div className="text-xs text-[#6e877a]">
              Stripe:{" "}
              <span className="font-mono text-[#2f453b]">
                {merchant?.stripe_account_id ? merchant.stripe_account_id : "not connected"}
              </span>
            </div>
            {!merchant?.stripe_account_id && (
              <button
                type="button"
                disabled={connectingStripe}
                onClick={async () => {
                  try {
                    setConnectingStripe(true);
                    setStripeError("");
                    setStripeActionMessage("");
                    const connect = await merchantApiFetch("/api/merchants/me/stripe/connect", {
                      method: "POST",
                      body: JSON.stringify({ country: "CA" }),
                    });
                    if (!connect.response.ok) throw new Error(connect.data?.message || "Failed to connect Stripe");
                    const next = await merchantApiFetch("/api/merchants/me/dashboard");
                    if (next.response.ok) setState({ loading: false, error: "", data: next.data });
                    setStripeActionMessage("Stripe account connected.");
                  } catch (e) {
                    setStripeError(e.message || "Failed to connect Stripe");
                  } finally {
                    setConnectingStripe(false);
                  }
                }}
                className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-xs font-semibold text-[#365242] hover:bg-[#f4f8ef] disabled:opacity-60"
              >
                {connectingStripe ? "Connecting..." : "Connect Stripe"}
              </button>
            )}
          </div>
        </div>
        {stripeError && <p className="mt-3 text-sm text-[#b75f5f]">{stripeError}</p>}
        {stripeActionMessage && <p className="mt-3 text-sm text-[#5f786b]">{stripeActionMessage}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#dbe7d4] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6e877a]">Total orders</p>
          <p className="mt-2 text-2xl font-semibold text-[#2f453b]">{summary?.total_orders ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[#dbe7d4] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6e877a]">Total revenue</p>
          <p className="mt-2 text-2xl font-semibold text-[#2f453b]">{formatMoney(summary?.total_revenue_cents)}</p>
        </div>
        <div className="rounded-2xl border border-[#dbe7d4] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6e877a]">Platform fees</p>
          <p className="mt-2 text-2xl font-semibold text-[#2f453b]">{formatMoney(summary?.platform_fee_cents)}</p>
        </div>
        <div className="rounded-2xl border border-[#dbe7d4] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6e877a]">Net earnings</p>
          <p className="mt-2 text-2xl font-semibold text-[#2f453b]">{formatMoney(summary?.net_earnings_cents)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2f453b]">Recent orders</h2>
          <Link href="/seller/orders" className="text-sm font-medium text-[#6f9a5f]">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-[#6e877a]">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2ebdd] text-xs uppercase tracking-wide text-[#6e877a]">
                  <th className="py-3 pr-3">Order</th>
                  <th className="py-3 pr-3">Total</th>
                  <th className="py-3 pr-3">Platform fee</th>
                  <th className="py-3 pr-3">Seller gets</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[#f0f6eb] text-[#365242]">
                    <td className="py-3 pr-3 font-mono">#{o.id}</td>
                    <td className="py-3 pr-3">{formatMoney(o.total_amount_cents)}</td>
                    <td className="py-3 pr-3">{formatMoney(o.platform_fee_cents)}</td>
                    <td className="py-3 pr-3">{formatMoney(o.merchant_amount_cents)}</td>
                    <td className="py-3 pr-3">{String(o.status || "").toLowerCase()}</td>
                    <td className="py-3">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2f453b]">Stripe & verification demo</h2>
            <p className="mt-1 text-sm text-[#6e877a]">
              Toggle the verification state to simulate payout restrictions in Stripe Connect.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["verified", "restricted", "failed", "pending"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={async () => {
                  await merchantApiFetch("/api/merchants/me/verification", {
                    method: "POST",
                    body: JSON.stringify({ status }),
                  });
                  const next = await merchantApiFetch("/api/merchants/me/dashboard");
                  if (next.response.ok) setState({ loading: false, error: "", data: next.data });
                }}
                className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef]"
              >
                Set {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              setStripeError("");
              const res = await merchantApiFetch("/api/merchants/me/stripe/onboarding-link", { method: "POST" });
              if (!res.response.ok) {
                setStripeError(res.data?.message || "Failed to create onboarding link");
                return;
              }
              window.open(res.data.url, "_blank", "noopener,noreferrer");
            }}
            className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef]"
          >
            Open onboarding (API link)
          </button>
          <button
            type="button"
            onClick={async () => {
              setStripeError("");
              const res = await merchantApiFetch("/api/merchants/me/stripe/payout-schedule", {
                method: "POST",
                body: JSON.stringify({ interval: "weekly", weekly_anchor: "friday", delay_days: 2 }),
              });
              if (!res.response.ok) {
                setStripeError(res.data?.message || "Failed to set payout schedule");
                return;
              }
              setStripeActionMessage("Payout schedule set to weekly (Friday).");
            }}
            className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef]"
          >
            Set payout schedule (weekly)
          </button>
          <button
            type="button"
            onClick={async () => {
              setStripeError("");
              const res = await merchantApiFetch("/api/merchants/me/stripe/simulate-verification", {
                method: "POST",
                body: JSON.stringify({ scenario: "restricted" }),
              });
              if (!res.response.ok) {
                setStripeError(res.data?.message || "Failed to simulate verification");
                return;
              }
              const next = await merchantApiFetch("/api/merchants/me/dashboard");
              if (next.response.ok) setState({ loading: false, error: "", data: next.data });
              setStripeActionMessage("Stripe simulation ran (restricted).");
            }}
            className="rounded-xl border border-[#d6e3cf] bg-white px-3 py-2 text-sm font-semibold text-[#365242] hover:bg-[#f4f8ef]"
          >
            Simulate restricted (Stripe token)
          </button>
        </div>
      </section>
    </div>
  );
}

