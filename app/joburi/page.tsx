import { redirect } from "next/navigation";

/**
 * DIE ALTE ADRESSE BLEIBT AM LEBEN (Owner 31.08.2026: „die url muss heissen erst mal
 * /joburi/germana nicht joburi").
 *
 * Der Trichter ist nach `/joburi/germana` gezogen. `/joburi` wird deshalb nicht gelöscht,
 * sondern leitet dorthin weiter: In den geschalteten Meta-Anzeigen steht die alte Adresse,
 * und jeder Klick darauf ist bezahlt. Ein 404 an dieser Stelle wäre Geld, das ins Leere
 * läuft — und zwar genau bei den Leuten, für die wir bezahlt haben.
 *
 * DIE SUCHPARAMETER REISEN MIT: `?lang=de` steuert die Sprache, `utm_*` sagt, aus welcher
 * Anzeige jemand kam. Fielen sie hier weg, stünde hinterher in jedem Lead „Herkunft
 * unbekannt" — und die Frage, ob die Anzeige die richtigen Leute bringt, wäre nicht mehr zu
 * beantworten.
 */
export default async function JoburiAlteAdresse({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v) && v[0]) q.set(k, v[0]);
  }
  const rest = q.toString();
  redirect(`/joburi/germana${rest ? `?${rest}` : ""}`);
}
