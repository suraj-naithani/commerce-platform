"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
import Spinner from "../../../components/Spinner";
import { setMerchantToken } from "../../../lib/merchantAuth";

export default function SellerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("seller@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.includes("@") || password.length < 1) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/merchants/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.message || "Login failed");

      setMerchantToken(data.token);
      router.push("/seller/dashboard");
    } catch (e) {
      setError(e.message || "Login failed");
      setLoading(false);
    }
  };

  if (loading) return <Spinner label="Signing you in..." />;

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#dbe7d4] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#2f453b]">Seller login</h1>
      <p className="mt-2 text-sm text-[#6e877a]">
        Demo credentials are prefilled. You can also register via `POST /api/merchants/register`.
      </p>

      <div className="mt-6 grid gap-3">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        {error && <p className="text-sm text-[#b75f5f]">{error}</p>}
        <Button onClick={handleLogin}>Login</Button>
      </div>
    </div>
  );
}

