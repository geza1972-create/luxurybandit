import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * SEINE HOCHGELADENEN BILDER — NUR FÜR DEN ADMIN (Owner 11.09.2026: „ich will alles sehen, was
 * sie hochladen, schon hier").
 *
 * Liefert genau eine Datei aus `versusforge-lauf-fotos/`, sonst nichts — der Pfad muss mit
 * diesem Ordner beginnen, damit hier nicht über einen erratenen Pfad andere private Bilder
 * (Künstlerprofile, Motive) ausgeliefert werden. Geschützt mit demselben Schlüssel wie
 * `/engine/gespraeche`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY ?? "";
  if (!schluessel || sp.get("s") !== schluessel) return new Response("Not found", { status: 404 });

  const pfad = String(sp.get("p") ?? "");
  if (!pfad.startsWith("versusforge-lauf-fotos/") || pfad.includes("..")) return new Response("Not found", { status: 404 });

  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!res.ok) return new Response("Not found", { status: 404 });
  const typ = pfad.endsWith(".webp") ? "image/webp" : pfad.endsWith(".png") ? "image/png" : "image/jpeg";
  return new Response(await res.arrayBuffer(), { headers: { "Content-Type": typ, "Cache-Control": "private, no-store" } });
}
