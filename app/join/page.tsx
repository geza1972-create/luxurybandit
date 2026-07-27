import JoinForm from "@/components/JoinForm";

// ANMELDESEITE statt Meta-Lead-Formular (Owner 27.07.2026): Die Anzeige verlinkt direkt
// hierher. Optik wie ein Sofortformular, Ende aber die Kasse — kein Lead, der nie zahlt.
// Absichtlich OHNE TopNav/Menü: jeder Ausgang kostet Abschlüsse.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join LuxuryBandit — early adopter price",
  description: "Chat free with your AI influencer, 25 videos a month across all topics. First month 19 € with your code, then 49 €.",
  robots: { index: false, follow: false },
};

export default async function JoinPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const topic = String(sp.topic ?? "chat").trim().slice(0, 20);
  const email = String(sp.email ?? "").trim().slice(0, 160);
  const name = String(sp.name ?? sp.first ?? "").trim().slice(0, 60);
  const paid = String(sp.paid ?? "") === "1";   // Rückkehr von Stripe
  // ?fast=1 → er kam aus dem Meta-Formular und hat die Fragen dort schon beantwortet.
  const fast = String(sp.fast ?? "") === "1";

  return (
    <main className="lb-bg min-h-screen">
      <JoinForm code={code} topic={topic} presetEmail={email} presetName={name} paid={paid} fast={fast} />
    </main>
  );
}
