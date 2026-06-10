"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LuxbanditFitPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tools/luxbanditcut?tool=fashion");
  }, [router]);
  return null;
}
