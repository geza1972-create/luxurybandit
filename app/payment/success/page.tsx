"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <CheckCircle className="h-16 w-16 text-green-500" strokeWidth={1.5} />
        <div>
          <h1 className="text-2xl font-semibold text-black">Credits added!</h1>
          <p className="mt-2 text-sm text-black/50">
            Your try-on credits have been added to your account. You can now use the AI virtual try-on.
          </p>
        </div>
        <Link
          href="/stores"
          className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/80"
        >
          Back to Luxurybandit
        </Link>
      </div>
    </main>
  );
}
