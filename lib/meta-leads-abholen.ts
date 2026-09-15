import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { leadAnlegen } from "@/lib/kuenstler-lead";
import { einladungSchicken } from "@/lib/versusforge-einladung-post";

/**
 * ── DIE LEADS AUS DEM SOFORTFORMULAR ABHOLEN (Owner 14.09.2026: „B") ────────────────────────
 *
 * ZWEI WEGE STANDEN ZUR WAHL, und der andere ist bewusst NICHT gebaut:
 *
 *  · WEBHOOK — Meta ruft uns an, sobald jemand absendet. Schneller, aber er verlangt ein Abo
 *    auf der Seite (`pages_manage_metadata` im Token), einen erreichbaren Endpunkt und eine
 *    Signaturprüfung. Drei Stellen, die still kaputtgehen können, und niemand merkt es: Ein
 *    Webhook, der nicht mehr zugestellt wird, sieht aus wie „keine Leads".
 *  · ABHOLEN — wir fragen alle 15 Minuten nach. Eine Stelle, ein Token, und wenn ein Lauf
 *    ausfällt, holt der nächste ihn mit auf. Das ist der Grund für diese Wahl.
 *
 * ── WAS HIER NICHT PASSIERT ────────────────────────────────────────────────────────────────
 *
 * KEINE ANALYSE, KEIN MODELLAUFRUF. Dieser Lauf legt nur Adressen ab und schickt eine Mail —
 * er darf niemals Geld kosten, sonst wird aus einem Zeitplan eine Kostenschleife.
 *
 * ── DIE MERKLISTE IST DER GANZE TRICK ──────────────────────────────────────────────────────
 *
 * `leadAnlegen` erzeugt bei JEDEM Aufruf eine neue Zufallskennung. Ohne Gedächtnis würde
 * derselbe Mensch alle 15 Minuten erneut angelegt und erneut angemailt — 96-mal am Tag. Also
 * merken wir uns die `leadgen_id`, die Meta je Absendung vergibt, in EINER Datei.
 *
 * SIE WIRD NUR GESCHRIEBEN, WENN ES WIRKLICH NEUE GAB. Ein Lauf ohne Leads kostet genau eine
 * Leseanfrage bei Supabase.
 */

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION?.trim() || "v21.0"}`;

/** Die Facebook-Seite, unter der die Formulare hängen. Als Env überschreibbar, damit ein
 *  Seitenwechsel keine Code-Änderung braucht. */
const SEITE = () => (process.env.META_PAGE_ID?.trim() || "1260478413826146");

const MERK_PFAD = "versusforge-meta-lead/gesehen.json";

/** Wie viele `leadgen_id` wir behalten. Reicht für Monate und hält die Datei klein. */
const MERK_MAX = 4000;

type Merk = { ids: string[] };

async function gesehenLesen(): Promise<Set<string>> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(MERK_PFAD)}`).catch(() => null);
  if (!res?.ok) return new Set();
  try {
    const m = (await res.json()) as Merk;
    return new Set(Array.isArray(m?.ids) ? m.ids.map(String) : []);
  } catch { return new Set(); }
}

async function gesehenSchreiben(ids: Set<string>): Promise<void> {
  const liste = [...ids].slice(-MERK_MAX);
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(MERK_PFAD)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-upsert": "true",
      /* OHNE DAS LIEST DER NÄCHSTE LAUF DIE ALTE FASSUNG und mailt alle noch einmal an —
         derselbe Cache-Fehler wie bei `mandantSpeichern` (14.09.2026). */
      "cache-control": "no-cache, max-age=0",
    },
    body: JSON.stringify({ ids: liste } satisfies Merk),
  }).catch(e => console.error("[meta-abholen] Merkliste nicht gespeichert:", e));
}

/**
 * Der Systemnutzer-Token darf die Formulare nicht direkt lesen — Meta verlangt dafür einen
 * SEITEN-Token. Den holen wir uns mit dem Systemnutzer-Token; er ist kurzlebig und wird nie
 * abgelegt (gemessen am 14.09.2026: mit Systemtoken „(#190) This method must be called with a
 * Page Access Token", mit Seitentoken kamen die Formulare).
 */
async function seitenToken(token: string): Promise<string> {
  const res = await fetch(
    `${GRAPH}/${SEITE()}?fields=access_token&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  ).catch(() => null);
  if (!res?.ok) return "";
  try {
    return String(((await res.json()) as { access_token?: string }).access_token ?? "");
  } catch { return ""; }
}

/**
 * DIE FELDNAMEN KOMMEN AUS DEM FORMULAR, NICHT AUS DER DOKUMENTATION (gemessen am 14.09.2026:
 * `nume_complet`, `e-mail`, `număr_de_telefon`, `campanie`).
 *
 * Der alte Webhook kannte nur die englischen Standardnamen — an einem rumänischen Formular
 * hätte er jeden Lead als „ohne Kontakt" verworfen. Deshalb stehen hier beide Sprachen, und
 * als letzter Rückfall wird auf ein @ geprüft: Wer sein Feld „Adresa ta" nennt, fällt sonst
 * durch, obwohl die Adresse dasteht.
 */
function felderLesen(feldDaten: { name?: string; values?: string[] }[]): { mail: string; name: string } {
  const hol = (...schluessel: string[]) => {
    for (const f of feldDaten) {
      const n = (f.name ?? "").toLowerCase().replace(/[\s_-]/g, "");
      if (schluessel.some(s => n === s.toLowerCase().replace(/[\s_-]/g, ""))) {
        return String(f.values?.[0] ?? "").trim();
      }
    }
    return "";
  };
  let mail = hol("email", "e-mail", "mail", "adresa de email", "adresă de e-mail").toLowerCase();
  if (!mail) {
    const irgendwo = feldDaten.find(f => String(f.values?.[0] ?? "").includes("@"));
    mail = String(irgendwo?.values?.[0] ?? "").trim().toLowerCase();
  }
  const name = hol("full_name", "name", "nume_complet", "nume", "numele tău");
  return { mail, name };
}

export type AbholBericht = {
  formulare: number;
  gefunden: number;
  neu: number;
  gemailt: number;
  fehler?: string;
  /** Im Probelauf: was angelegt WÜRDE. Adressen gekürzt — ein Bericht ist keine Adressliste. */
  vorschau?: string[];
};

/**
 * Holt alle neuen Leads. `nurZeigen` legt nichts an und schickt nichts — dieselbe Sitte wie
 * beim Rückläufer-Einsammler: Wer die Adresse von Hand aufruft, schaut nach.
 */
export async function metaLeadsAbholen(opt: { nurZeigen?: boolean } = {}): Promise<AbholBericht> {
  const leer: AbholBericht = { formulare: 0, gefunden: 0, neu: 0, gemailt: 0 };
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!token) return { ...leer, fehler: "META_PAGE_ACCESS_TOKEN fehlt." };

  const pToken = await seitenToken(token);
  if (!pToken) return { ...leer, fehler: "Seiten-Token nicht erhalten — Token prüfen." };

  const formRes = await fetch(
    `${GRAPH}/${SEITE()}/leadgen_forms?fields=id,name,status&limit=50&access_token=${encodeURIComponent(pToken)}`,
    { cache: "no-store" },
  ).catch(() => null);
  const formDaten = await formRes?.json().catch(() => null);
  if (!formRes?.ok || !Array.isArray(formDaten?.data)) {
    return { ...leer, fehler: String(formDaten?.error?.message ?? `Formulare nicht abrufbar (${formRes?.status ?? "?"})`) };
  }
  const formulare = (formDaten.data as { id?: string }[]).map(f => String(f.id ?? "")).filter(Boolean);

  const gesehen = await gesehenLesen();
  const bericht: AbholBericht = { ...leer, formulare: formulare.length };
  const vorschau: string[] = [];
  let etwasNeu = false;

  for (const formId of formulare) {
    /* NUR DIE JÜNGSTEN: Beim ersten Lauf an einem alten Formular wollen wir nicht Hunderte
       Menschen anmailen, die sich vor Wochen eingetragen haben. 50 reichen für 15 Minuten
       um ein Vielfaches. */
    const res = await fetch(
      `${GRAPH}/${formId}/leads?fields=id,created_time,field_data&limit=50&access_token=${encodeURIComponent(pToken)}`,
      { cache: "no-store" },
    ).catch(() => null);
    const daten = await res?.json().catch(() => null);
    if (!res?.ok || !Array.isArray(daten?.data)) {
      console.warn("[meta-abholen] Formular nicht lesbar:", formId, daten?.error?.message ?? res?.status);
      continue;
    }

    for (const lead of daten.data as { id?: string; field_data?: { name?: string; values?: string[] }[] }[]) {
      const id = String(lead.id ?? "");
      if (!id) continue;
      bericht.gefunden++;
      if (gesehen.has(id)) continue;

      const { mail, name } = felderLesen(Array.isArray(lead.field_data) ? lead.field_data : []);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        /* Ohne Adresse können wir ihn nicht einladen. Trotzdem merken — sonst sehen wir ihn
           bei jedem Lauf wieder an und prüfen ihn 96-mal am Tag vergeblich. */
        gesehen.add(id);
        etwasNeu = true;
        continue;
      }

      bericht.neu++;
      if (opt.nurZeigen) {
        vorschau.push(`${name || "(ohne Namen)"} · ${mail.slice(0, 3)}…@${mail.split("@")[1] ?? ""}`);
        continue;
      }

      /* Die Anzeige läuft in Rumänien — bis wir woanders werben, ist Rumänisch die Sprache. */
      const kennung = await leadAnlegen({ mail, name, sprache: "ro" }).catch(e => {
        console.error("[meta-abholen] Kennung nicht angelegt:", e);
        return "";
      });
      if (!kennung) continue;

      const ok = await einladungSchicken({ mail, name, kennung, sprache: "ro" }).catch(() => false);
      if (ok) bericht.gemailt++;

      /* ERST NACH DEM VERSAND MERKEN: Scheitert die Mail, soll der nächste Lauf es noch einmal
         versuchen dürfen. Die Kennung wäre dann eine zweite — das ist der kleinere Schaden als
         ein Lead, der nie eine Mail bekommt. */
      gesehen.add(id);
      etwasNeu = true;
      /* KEINE SMS MEHR JE LEAD (Owner 14.09.2026: „ich bekomme sms. Mach die Benachrichtigung
         raus"). Alle 15 Minuten mehrere Lead-Alarme aufs Telefon war zu viel — wer wartet, sieht
         es im Dashboard unter „wartet noch auf den Klick" (app/engine/gespraeche). */
    }
  }

  if (etwasNeu && !opt.nurZeigen) await gesehenSchreiben(gesehen);
  return opt.nurZeigen ? { ...bericht, vorschau } : bericht;
}
