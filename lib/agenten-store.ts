import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DIE ANFRAGEN VON UNTERNEHMEN — was aus „Teste mich" herausfällt.
 *
 * NICHT DAVID, SONDERN LB (Owner 29.08.2026: „dann ist nicht David, der den Kunden fragt,
 * was sie für Leads haben wollen, sondern LB." · „mach das auf die Startseite, aber nicht
 * als David"). David ist Recruiter — ein Gesicht, zwei Berufe, und man glaubt ihm keinen
 * von beiden. LuxuryBandit ist die Firma, die Agenten sind ihr Personal.
 *
 * Owner 29.08.2026: „Dann gleich ein Button ‚Teste mich'. Dann öffnet sich sein Chatfenster
 * … Ja, dann lass deine E-Mail-Adresse da und beschreibe, was du sonst noch willst, und ich
 * melde mich in 48 h bei dir. E-Mail an mich."
 *
 * WARUM ÜBERHAUPT GESPEICHERT, WENN OHNEHIN EINE MAIL RAUSGEHT: Eine Mail kann im Spam
 * landen, versehentlich gelöscht oder beim Aufräumen übersehen werden — und dann ist die
 * Anfrage weg, ohne dass jemand es merkt. Die Ablage ist das Gedächtnis; die Mail ist nur
 * der Wecker.
 *
 * EIGENER ORDNER (`agent-anfragen/`), NICHT `david/`: Dort liegen die Screening-Sitzungen,
 * und `listeDavid()` liest jede Datei darin als Sitzung. Zwei Sorten in einem Ordner wären
 * die nächste Fehlerquelle.
 */
export type FirmenAnfrage = {
  id: string;
  erstelltAm: string;
  /**
   * WELCHE TÜR (Owner 31.08.2026: „Lead bitte im bestehenden Admin-Bereich speichern, aber
   * klar als Recruiting-B2B-Lead kennzeichnen.").
   *
   * `agenten` ist die alte „Teste mich"-Anfrage aus dem Chat, `recruiting` die
   * Pilot-Anfrage von `/recruiting`. Bewusst EIN Ordner und EINE Liste statt einer zweiten
   * Ablage: Es ist beide Male dasselbe — ein Unternehmen, das etwas von uns will. Getrennt
   * werden sie durch dieses Feld, nicht durch einen zweiten Speicher, der beim nächsten Mal
   * wieder mitgepflegt werden müsste.
   *
   * Ohne Angabe ist es `agenten` — die Anfragen, die vor dem 31.08. eingingen, kannten das
   * Feld noch nicht.
   */
  art?: "agenten" | "recruiting";
  /** Wofür er Leads braucht — daran hängt später, welcher Agent gebaut wird. */
  ziel?: "kunden" | "mitarbeiter" | "neugier";
  name?: string;
  branche?: string;
  email?: string;
  /* Nur bei `recruiting`: Wer fragt, und für welche Stelle. */
  firma?: string;
  position?: string;
  stellenLink?: string;
  /** Was er selbst geschrieben hat — das Wertvollste an der ganzen Anfrage. */
  anliegen?: string;
  sprache?: string;
  device?: string;
  /** Ging die Benachrichtigung ans Haus wirklich raus? */
  gemeldet?: boolean;
  /** Wurde die Anfrage schon beantwortet? (von Hand im Admin gesetzt) */
  erledigtAm?: string;
};

const pfad = (id: string) => `agent-anfragen/${id}.json`;

export async function schreibeFirmenAnfrage(a: FirmenAnfrage): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(a.id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(a),
  });
  return res.ok;
}

export async function leseFirmenAnfrage(id: string): Promise<FirmenAnfrage | null> {
  if (!id) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`);
  if (!res.ok) return null;
  try { return (await res.json()) as FirmenAnfrage; } catch { return null; }
}

/** NUR für die Admin-Liste — dasselbe Muster wie `listeDavid`. */
export async function listeFirmenAnfragen(): Promise<FirmenAnfrage[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "agent-anfragen/", limit: 1000 }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const ids = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"))
    .map(n => n.replace(/\.json$/, ""));
  const alle = await Promise.all(ids.map(leseFirmenAnfrage));
  return alle
    .filter((a): a is FirmenAnfrage => !!a)
    .sort((x, y) => (y.erstelltAm || "").localeCompare(x.erstelltAm || ""));
}
