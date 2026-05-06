"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Spinner from "../../components/Spinner";

export default function CheckoutPage() {
  const { items: orderItems, hydrated } = useSelector((state) => state.cart);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [paymentFlow, setPaymentFlow] = useState("auto");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const showFundFlowDemo =
    searchParams?.get("demo") === "1" || String(process.env.NEXT_PUBLIC_DEMO_FUND_FLOW || "").toLowerCase() === "true";
  const itemCount = useMemo(
    () => orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [orderItems],
  );
  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [orderItems],
  );
  const shipping = orderItems.length === 0 ? 0 : subtotal > 50 ? 0 : 5;
  const total = subtotal + shipping;

  if (!hydrated) return <Spinner label="Loading checkout..." />;

  const handlePay = async () => {
    if (itemCount === 0) return;
    if (!email || !email.includes("@")) {
      setPaymentError("Please enter a valid email.");
      return;
    }

    try {
      setIsPaying(true);
      setPaymentError("");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: orderItems,
          flow: paymentFlow,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.message || "Failed to create payment session");
      }

      window.location.href = data.url;
    } catch (error) {
      setPaymentError(error.message || "Unable to start payment.");
      setIsPaying(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-[#2f453b]">Checkout</h1>
        <p className="mt-2 text-sm text-[#6e877a]">
          Simple and secure details form. {itemCount} item{itemCount === 1 ? "" : "s"} ready for payment.
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input placeholder="First name" />
          <Input placeholder="Last name" />
          <Input
            className="sm:col-span-2"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input className="sm:col-span-2" placeholder="Street address" />
          <Input placeholder="City" />
          <Input placeholder="Postal code" />
        </form>

        {showFundFlowDemo && (
          <div className="mt-6 rounded-2xl border border-[#e2ebdd] bg-[#f7fbf3] p-4">
            <p className="text-sm font-semibold text-[#2f453b]">Fund flow demo</p>
            <p className="mt-1 text-xs text-[#6e877a]">
              Choose a Stripe Connect flow for this checkout. If the merchant isn&apos;t connected/verified, the backend
              falls back to a platform charge.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[#365242]">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentFlow"
                  value="auto"
                  checked={paymentFlow === "auto"}
                  onChange={() => setPaymentFlow("auto")}
                />
                Auto (use destination charge when possible)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentFlow"
                  value="destination"
                  checked={paymentFlow === "destination"}
                  onChange={() => setPaymentFlow("destination")}
                />
                Destination charge (platform fee + transfer_data.destination)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentFlow"
                  value="separate"
                  checked={paymentFlow === "separate"}
                  onChange={() => setPaymentFlow("separate")}
                />
                Separate charges & transfers (transfer created after payment)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentFlow"
                  value="direct"
                  checked={paymentFlow === "direct"}
                  onChange={() => setPaymentFlow("direct")}
                />
                Direct charge (charge created on connected account)
              </label>
            </div>
          </div>
        )}
        {paymentError && <p className="mt-3 text-sm text-[#b75f5f]">{paymentError}</p>}

        <Button className="mt-6" disabled={itemCount === 0 || isPaying} onClick={handlePay}>
          {itemCount === 0 ? "Cart is empty" : isPaying ? "Redirecting to Stripe..." : `Pay with Stripe (${itemCount})`}
        </Button>
      </section>

      <aside className="h-fit rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2f453b]">Order summary</h2>
        {orderItems.length === 0 ? (
          <p className="mt-4 text-sm text-[#6e877a]">No items in cart.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm text-[#5f786b]">
                <span>
                  {item.name} x {item.quantity}
                </span>
                <span>${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2 border-t border-[#e2ebdd] pt-4 text-sm text-[#5f786b]">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-3 text-base font-semibold text-[#2f453b]">
          Total: ${total.toFixed(2)}
        </div>
      </aside>
    </div>
  );
}
