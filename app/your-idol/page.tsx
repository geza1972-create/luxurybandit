import { redirect } from "next/navigation";

// „Your Idol as an AI-Model" — Einstieg in den Try-On-Funnel im IDOL-Modus:
// kein Model-Grid, sondern direkt „Foto hochladen". Danach läuft alles Bestehende
// (Chat → Umziehen → Video). Ein Default-Look dient als Garment-Basis; der Nutzer
// kann im Funnel ein anderes Kleidungsstück wählen.
export default function YourIdolPage() {
  redirect("/try/look-1784191032626-70e3608b?idol=1");
}
