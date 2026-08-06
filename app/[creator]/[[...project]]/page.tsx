"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreatorProfilePage from "@/components/CreatorProfilePage";

// DIE WERKBANK HAT NUR NOCH EINE TUER.
//
// Frueher rendete dieser Pfad die LuxbanditCut-Werkbank direkt — und weil es ein
// Auffang-Pfad ist, tat er das fuer JEDE zweiteilige Adresse: /gerry/extractor genauso
// wie /foo/bar. Beides kam mit Status 200 und ganz ohne Anmeldung durch, waehrend
// /tools/… laengst hinter der Passwortabfrage lag. Die teuren Knoepfe der Werkbank
// waren damit fuer jeden erreichbar, der irgendeine Adresse riet.
//
// Danach leitete er auf die geschuetzte Werkbank-Adresse um — und DAS war der naechste
// Fehler (Owner 06.08.2026: „localhost:3000/admin/tools/luxbanditcut", nachdem er die
// Gutschein-Seite geoeffnet hatte).
//
// DENN DIESER PFAD FAENGT JEDE ZWEITEILIGE ADRESSE, und zweiteilig sind auch
// /themes/gutschein, /themes/kiss und /einladung/abc123. Solange die echte Route sauber
// gebaut ist, gewinnt sie; bei jedem Wackler — altes Bundle im Tab, Deploy im Gang,
// kaputter Client-Manifest — faellt der Besucher hierher. Er landete dann nicht auf einer
// Fehlerseite, sondern an der Passwortwand eines ADMIN-Werkzeugs. Fuer eine Kundin ist das
// das Ende des Kaufs: Sie sieht eine Anmeldung, die sie nichts angeht, und ist weg.
//
// Deshalb geht es jetzt nach HAUSE. Die blanke Adresse ist das Portal (die Startseite
// rendert die Themen selbst) — wer hier falsch abbiegt, steht im Laden statt vor einer
// fremden Tuer. Die Werkbank verliert dadurch nichts: Der Owner erreicht sie ueber das
// Admin-Menue, und einen Namen aus der Adresse bekam sie hier ohnehin nie mit.
const HAUS = "/";

/**
 * DIE ECHTEN BEREICHE DES HAUSES — sie gehören NIE diesem Auffang-Pfad.
 *
 * Zweiteilige Adressen sind hier die Regel, nicht die Ausnahme: /themes/gutschein,
 * /einladung/abc123, /curator/17, /try/xyz. Next.js gibt einer konkreten Route immer den
 * Vorrang, also greift dieser Pfad im Normalfall gar nicht — aber genau darauf war Verlass,
 * und das reichte nicht. Ein Tab mit altem Bundle, ein Deploy mitten im Klick, ein kaputter
 * Client-Manifest: dann wacht dieser Auffang-Pfad auf einer Adresse auf, die ihm nicht
 * gehört, und die Kundin fliegt aus ihrem Kauf.
 *
 * Steht der erste Teil der Adresse auf dieser Liste, wird deshalb NICHT umgeleitet, sondern
 * EINMAL hart nachgeladen. Der Server kennt die richtige Route und liefert sie; der Fehler
 * heilt sich, statt jemanden woandershin zu schicken. Nur wenn auch das nicht hilft, geht es
 * nach Hause — sonst liefe ein Neuladen im Kreis.
 *
 * Die Liste ist `ls app/` (06.08.2026), ohne die dynamischen Ordner. Kommt ein Bereich dazu
 * und wird hier vergessen, ist der Ausfall mild: Er landet auf der Startseite statt in einer
 * Schleife.
 */
const BEREICHE = new Set([
  "about", "account", "admin", "ai-notice", "api", "auth", "become-seller", "bella",
  "card-studio", "chat", "ci", "clothes", "contact", "curator", "curators", "data-deletion",
  "earnings", "einladung", "entdecken", "grow-card", "gruss-test", "home", "imprint",
  "lb-value", "login", "look", "luxury-products", "messages", "model-rules", "models-wanted",
  "my-gallery", "my-journey", "my-studio", "off", "offer", "own-influencer", "own",
  "pay-done", "payment", "platform", "post", "pricing", "privacy", "profile", "seller",
  "store", "stores", "studio", "terms", "themes", "tools", "try-this-look", "try", "tryon",
  "u", "unsubscribe", "urlaub-mit-bella", "user", "w", "welcome", "wetter", "you-in-video",
  "your-idol",
]);

export default function CreatorOrWorkspace() {
  const params = useParams();
  const router = useRouter();
  const project = params?.project;
  const hasProject = Array.isArray(project) ? project.length > 0 : !!project;
  const creatorSlug = String(params?.creator ?? "");

  // For a bare profile URL (/szidonia-bandi), prefer the canonical curator page.
  // Resolve the slug → curator id and redirect; fall back to the legacy profile
  // page only when no curator matches (e.g. a Supabase-only creator).
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    /**
     * ERST DER SELBSTHEILUNGS-VERSUCH. Gehört die Adresse einem echten Bereich, sind wir hier
     * nur wegen eines veralteten Bundles gelandet — ein hartes Nachladen holt vom Server die
     * Route, die es wirklich gibt. Die Marke im Sitzungsspeicher sorgt dafür, dass das genau
     * EINMAL je Adresse passiert; sonst würde eine Adresse, die auch der Server hier landen
     * lässt, den Browser in eine Endlosschleife schicken.
     */
    if (BEREICHE.has(creatorSlug)) {
      const marke = `lb_umweg_${location.pathname}`;
      let schon = true;
      try { schon = sessionStorage.getItem(marke) === "1"; sessionStorage.setItem(marke, "1"); }
      catch { schon = true; }   // privater Modus: lieber gar nicht neu laden als im Kreis
      if (!schon) { window.location.reload(); return; }
      /* Nachladen hat nicht geholfen — dann nach Hause. Und NIE als Kuratorin auslegen:
         „themes" oder „einladung" ist kein Mensch, und die Profilseite darunter wäre für den
         Besucher genauso falsch wie die Werkbank vorher. */
      router.replace(HAUS); return;
    }
    if (hasProject) { router.replace(HAUS); return; }
    if (!creatorSlug) { setResolved(true); return; }
    let active = true;
    fetch(`/api/curator?bySlug=${encodeURIComponent(creatorSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!active) return;
        if (d?.id) router.replace(`/curator/${d.id}`);
        else setResolved(true);
      })
      .catch(() => { if (active) setResolved(true); });
    return () => { active = false; };
  }, [creatorSlug, hasProject, router]);

  // Resolving (or redirecting — auch der Heimweg oben) → spinner; once resolved with no
  // curator, legacy page.
  if (hasProject || !resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      </div>
    );
  }
  return <CreatorProfilePage creatorSlug={creatorSlug} />;
}
