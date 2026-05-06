"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../../../components/Button";
import Input from "../../../components/Input";
import Spinner from "../../../components/Spinner";
import { setMerchantToken } from "../../../lib/merchantAuth";

export default function SellerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [country, setCountry] = useState("CA");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError("");
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = name.trim();

    if (mode === "register" && trimmedName.length < 2) return setError("Enter a store name.");
    if (!trimmedEmail.includes("@")) return setError("Enter a valid email.");
    if (trimmedPassword.length < 6) return setError("Password must be at least 6 characters.");

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const endpoint = mode === "register" ? "/api/merchants/register" : "/api/merchants/login";
      const payload =
        mode === "register"
          ? { name: trimmedName, email: trimmedEmail, password: trimmedPassword, country }
          : { email: trimmedEmail, password: trimmedPassword };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.message || "Request failed");

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
      <h1 className="text-2xl font-semibold text-[#2f453b]">Seller portal</h1>
      <p className="mt-2 text-sm text-[#6e877a]">Access your dashboard, orders, and payouts.</p>

      <div className="mt-6 flex gap-2 rounded-2xl bg-[#f4f8ef] p-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${
            mode === "login" ? "bg-white text-[#2f453b] shadow-sm" : "text-[#587165]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${
            mode === "register" ? "bg-white text-[#2f453b] shadow-sm" : "text-[#587165]"
          }`}
        >
          Create account
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {mode === "register" && (
          <>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" />
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (e.g. CA)" />
          </>
        )}
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        {error && <p className="text-sm text-[#b75f5f]">{error}</p>}
        <Button onClick={handleAuth}>{mode === "register" ? "Create account" : "Login"}</Button>
      </div>
    </div>
  );
}

