import { redirect } from "next/navigation";

// Wetter lebt jetzt kanonisch unter /themes/wetter/<model>. Alte Links (auch die
// bereits per WhatsApp/E-Mail verschickten persönlichen ?s=…-Logins) landen dort —
// ALLE Query-Parameter werden übernommen.
export const dynamic = "force-dynamic";

export default async function LegacyWetterRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ model: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { model } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    q.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
  }
  const qs = q.toString();
  redirect(`/themes/wetter/${encodeURIComponent(model)}${qs ? `?${qs}` : ""}`);
}
