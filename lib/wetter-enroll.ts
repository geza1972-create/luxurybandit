import { readWetterSubscribers, writeWetterSubscribers, type WetterSubscriber } from "@/lib/try-this-look-store";

/**
 * JEDER Kunde bekommt das tägliche Wetter (Owner, 2026-07-27): egal über welches Thema er
 * hereinkommt — Kuss, Idol, Geburtstag, Surprise — er landet in derselben Wetter-Liste und
 * erhält die Tagespost. Das Wetter ist damit nicht nur ein Thema, sondern der Kanal, über
 * den wir alle Kunden täglich erreichen.
 *
 * Idempotent: dieselbe Adresse zweimal anmelden legt niemanden doppelt an. Wer sich
 * abgemeldet hat (`unsubscribed`), wird NICHT wieder eingetragen — sonst wäre die
 * Abmeldung wertlos und der Versand rechtlich angreifbar.
 */
export async function enrollWetter(opts: {
  email: string;
  name?: string;
  lang?: string;
  note?: string;          // woher er kommt, z. B. „kiss-abo"
}): Promise<"added" | "exists" | "unsubscribed" | "invalid"> {
  const email = (opts.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "invalid";

  const current = await readWetterSubscribers();
  const found = current.find(s => (s.email ?? "").trim().toLowerCase() === email);
  if (found) return found.unsubscribed ? "unsubscribed" : "exists";

  const entry: WetterSubscriber = {
    id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    name: (opts.name ?? "").trim().slice(0, 120) || email.split("@")[0],
    email,
    lang: (opts.lang ?? "").trim().slice(0, 5) || "en",
    note: (opts.note ?? "").trim().slice(0, 300),
    createdAt: new Date().toISOString(),
  };
  await writeWetterSubscribers([entry, ...current]);
  return "added";
}
