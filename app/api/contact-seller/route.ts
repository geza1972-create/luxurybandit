import { readTryThisLookState } from "@/lib/try-this-look-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Simple in-memory rate limit: max 5 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lookId = url.searchParams.get("lookId")?.trim();
    const name = url.searchParams.get("name")?.trim() ?? "";
    const msg = url.searchParams.get("msg")?.trim() ?? "";

    if (!lookId) {
      return NextResponse.json({ error: "lookId required." }, { status: 400 });
    }

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const state = await readTryThisLookState();

    // Find look
    const look = state.looks.find((l) => l.id === lookId);
    if (!look) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    // Get WhatsApp number: prefer direct on look, fall back to store
    let waNumber =
      look.whatsappNumber ??
      state.stores?.find((s) => s.slug === look.storeSlug)?.whatsappNumber ??
      "";

    waNumber = waNumber.replace(/\D/g, "");

    if (!waNumber) {
      return NextResponse.json(
        { error: "This seller has no WhatsApp number configured." },
        { status: 404 }
      );
    }

    // Build message
    const price = look.salePrice ?? look.price ?? "";
    const defaultMsg = `Hi! I'm interested in "${look.name}"${price ? ` (${price})` : ""}. My name is ${name || "a buyer"}. ${msg}`.trim();
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(defaultMsg)}`;

    return NextResponse.redirect(waUrl, 302);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process request." },
      { status: 500 }
    );
  }
}
