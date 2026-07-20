import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Die Startseite IST jetzt Bella — das Aushängeschild. Wer luxurybandit.com öffnet,
  // landet sofort bei ihr (tägliche Nachrichten + Anmeldung). Die Models-Galerie bleibt
  // über das Menü / das Logo erreichbar (/stores?view=models).
  redirect("/bella");
}
