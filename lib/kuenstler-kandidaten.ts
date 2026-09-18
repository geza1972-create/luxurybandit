import { randomUUID } from "crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * KÜNSTLER, DIE UNS NOCH NICHT KENNEN (Owner 16.09.2026: „ich bin bei Meta gesperrt … du sollst
 * mir Marketing-Agenten bauen" · „ich will gute Künstler zuerst, die Abos zahlen werden").
 *
 * ── DIE EINZIGE LISTE IM HAUS, DIE NACH AUSSEN ZEIGT ────────────────────────────────────────
 *
 * Jede andere Ablage hier drin ist REAKTIV: Warteliste, Lead, Follower — alle entstehen erst,
 * wenn jemand selbst ein Formular ausgefüllt hat. Das war Metas Arbeit, und Meta ist weg. Diese
 * Ablage ist die erste, in der ein Mensch steht, der uns nie um etwas gebeten hat.
 *
 * Genau deshalb ist sie streng:
 *
 * — **Nur öffentliche Geschäftsadressen.** Atelier, Galerie, Impressum, eigene Seite. Keine
 *   abgegriffenen Profile, keine erratenen Adressen. Die Quelle steht bei jedem Eintrag; wer
 *   sie nicht nennen kann, gehört nicht in die Liste.
 * — **Eine Nachricht, keine zweite.** `geschicktAm` wird gesetzt, bevor die Mail rausgeht;
 *   `schonGeschrieben` sperrt jeden weiteren Versuch. Ein Nachfassen gibt es nicht — das steht
 *   so in der Mail, und was dort steht, hält die Ablage ein.
 * — **Nein heisst gelöscht.** `abgelehntAm` sperrt die Adresse dauerhaft; die vorbereitete
 *   Seite wird dabei entfernt, nicht nur versteckt.
 *
 * ── WAS „VORBEREITET" HEISST ────────────────────────────────────────────────────────────────
 *
 * Zu jedem Kandidaten entsteht VOR dem Anschreiben seine eigene Entwurfsseite mit seinem Werk
 * als Living Poster (Owner 16.09.2026, auf die Frage, was hinter dem Knopf liegen soll: „was
 * besser ist, klar" — also die fertige Seite samt laufendem QR-Code).
 *
 * Diese Seite ist UNSICHTBAR, bis er Ja sagt: `portal: false` hält sie aus der Übersicht, der
 * Link besteht aus seiner Kennung und seinem Schlüssel und steht nur in seiner Mail. Wir haben
 * sein Werk benutzt, ohne zu fragen — dann darf daraus wenigstens nichts Öffentliches werden.
 */

export type Kandidat = {
  id: string;
  /** Sein Name, so wie er ihn selbst schreibt. */
  name: string;
  /** Die öffentliche Adresse, an die geschrieben wird. */
  mail: string;
  /** WO wir ihn gefunden haben — als Adresse, nicht als Behauptung. */
  quelle: string;
  /** Das Werk, über das wir schreiben. */
  werkTitel?: string;
  /** Die Adresse des Bildes an der Quelle — daraus entsteht sein Poster. */
  werkUrl?: string;
  sprache: string;
  land?: string;

  /** Was die Vorbereitung erzeugt hat. */
  kennung?: string;
  link?: string;
  /** Sein Nein — derselbe Weg, den jeder Künstler hat, und er löscht wirklich. */
  loeschLink?: string;
  spruch?: string;
  vorbereitetAm?: string;

  geschicktAm?: string;
  /** Er hat geantwortet oder die Seite behalten — dann ist er kein Kandidat mehr. */
  gewonnenAm?: string;
  /** Sein Nein. Die Adresse bleibt hier stehen, damit sie nie wieder angeschrieben wird. */
  abgelehntAm?: string;
  notiz?: string;
  angelegt: string;
};

const ORDNER = "versusforge-kandidaten";
const pfad = (id: string) => `${ORDNER}/${id.replace(/[^a-z0-9]/gi, "").slice(0, 64)}.json`;

/** Kleingeschrieben, bevor irgendetwas damit passiert — sonst sind es zwei Kandidaten. */
export const adresse = (m: string) => String(m ?? "").trim().toLowerCase();

async function schreiben(k: Kandidat): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(k.id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(k),
  }).catch(() => null);
  if (!res?.ok) console.error("[kandidaten] nicht gespeichert:", k.id, res?.status);
  return !!res?.ok;
}

export async function kandidatLesen(id: string): Promise<Kandidat | null> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`).catch(() => null);
  if (!res?.ok) return null;
  try { return (await res.json()) as Kandidat; } catch { return null; }
}

export async function alleKandidaten(): Promise<Kandidat[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: ORDNER, limit: 1000 }),
  }).catch(() => null);
  if (!res?.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const liste = await Promise.all(dateien.map(d => (d.name ? kandidatLesen(d.name.replace(/\.json$/, "")) : null)));
  return liste.filter((k): k is Kandidat => !!k)
    .sort((a, b) => (a.angelegt < b.angelegt ? 1 : -1));
}

/**
 * NEU IN DIE LISTE — oder eben nicht.
 *
 * Eine Adresse steht höchstens einmal drin. Steht sie schon da, gewinnt der ALTE Eintrag:
 * Er trägt womöglich ein `geschicktAm` oder ein `abgelehntAm`, und das darf ein zweiter Fund
 * derselben Galerie nicht zurücksetzen — sonst bekäme jemand die „du bekommst keine zweite"
 * Mail zum zweiten Mal.
 */
export async function kandidatDazu(k: Omit<Kandidat, "id" | "angelegt">): Promise<{ id: string; neu: boolean } | null> {
  const mail = adresse(k.mail);
  if (!mail || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail)) return null;
  const schon = (await alleKandidaten()).find(x => adresse(x.mail) === mail);
  if (schon) return { id: schon.id, neu: false };

  const id = randomUUID().replace(/-/g, "").slice(0, 20);
  const eintrag: Kandidat = { ...k, mail, id, angelegt: new Date().toISOString() };
  return (await schreiben(eintrag)) ? { id, neu: true } : null;
}

/** Frisch lesen, schmal schreiben — wie bei den Mandanten: sonst überholt ein Lauf den anderen. */
export async function kandidatAendern(id: string, felder: Partial<Kandidat>): Promise<Kandidat | null> {
  const frisch = await kandidatLesen(id);
  if (!frisch) return null;
  const neu = { ...frisch, ...felder, id: frisch.id, angelegt: frisch.angelegt };
  return (await schreiben(neu)) ? neu : null;
}

/** Wurde diese Adresse schon einmal angeschrieben — oder hat sie Nein gesagt? */
export async function schonGeschrieben(mail: string): Promise<boolean> {
  const m = adresse(mail);
  return (await alleKandidaten()).some(k => adresse(k.mail) === m && (k.geschicktAm || k.abgelehntAm));
}
