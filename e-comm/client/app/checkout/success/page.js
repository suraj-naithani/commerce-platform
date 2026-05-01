"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Button from "../../../components/Button";
import Spinner from "../../../components/Spinner";
import { clearCart } from "../../../redux/slices/cartSlice";

export default function CheckoutSuccessPage() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/api/payments/session/${sessionId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.payment_status === "paid") {
          dispatch(clearCart());
          setEmail(data.customer_email || "");
          setAmount(typeof data.amount_total === "number" ? (data.amount_total / 100).toFixed(2) : "");
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, [dispatch, sessionId]);

  if (!sessionId) {
    return (
      <section className="rounded-2xl border border-[#f0d4d4] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#a94f4f]">Payment verification failed</h1>
        <p className="mt-3 text-sm text-[#6f867a]">Missing payment session. Please retry checkout.</p>
        <Link href="/checkout" className="mt-5 inline-block">
          <Button>Back to checkout</Button>
        </Link>
      </section>
    );
  }

  if (status === "loading") return <Spinner label="Verifying payment..." />;

  if (status === "error") {
    return (
      <section className="rounded-2xl border border-[#f0d4d4] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#a94f4f]">Payment verification failed</h1>
        <p className="mt-3 text-sm text-[#6f867a]">We could not confirm your payment. Please check your checkout details.</p>
        <Link href="/checkout" className="mt-5 inline-block">
          <Button>Back to checkout</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#dbe7d4] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#2f453b]">Payment successful</h1>
      <p className="mt-3 text-sm text-[#6f867a]">Your payment has been confirmed and your cart is now cleared.</p>
      <div className="mt-5 space-y-2 text-sm text-[#5f786b]">
        {email && <p>Receipt Email: {email}</p>}
        {amount && <p>Paid Amount: ${amount}</p>}
      </div>
      <Link href="/" className="mt-6 inline-block">
        <Button>Continue shopping</Button>
      </Link>
    </section>
  );
}
