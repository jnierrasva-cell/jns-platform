"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PricingCheckoutButton({
  plan,
  label,
  className,
}: {
  plan: "starter" | "pro" | "business";
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !data.url) {
        alert(data.error || "Could not start checkout");
        return;
      }
      window.location.href = data.url;
    } catch {
      alert("Could not start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className={className}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}