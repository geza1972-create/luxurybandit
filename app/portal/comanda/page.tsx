import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getCheckoutSession } from "@/lib/stripe";
import { bestellNummer } from "@/lib/lakatosbandi-bestellung";
import { portalPfade } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { eur } from "@/lib/pricing";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DIE SEITE NACH DER ZAHLUNG (Owner 16.09.2026: „aber eine Bestätigungsseite gibt es immer noch
 * nicht").
 *
 * ── WAS VORHER PASSIERTE: NICHTS ────────────────────────────────────────────────────────────
 *
 * Stripe schickte den Käufer zurück auf die Künstlerseite mit `?bestellt=1` — und diesen
 * Anhänger las keine einzige Zeile im ganzen Haus. Er sah dieselbe Seite wie vor dem Kauf und
 * musste raten, ob seine Bestellung angekommen ist. Genau der Moment, in dem jemand denkt, er
 * sei abgezockt worden (Owner 30.07.2026: „nach dem ich bezahlt habe ist nichts passiert").
 *
 * ── DIE SEITE BEHAUPTET NICHTS, SIE FRAGT STRIPE ────────────────────────────────────────────
 *
 * Der Browser bringt nur die Sitzungskennung mit. Ob bezahlt wurde, was bestellt wurde und an
 * welche Adresse die Bestätigung ging, wird bei Stripe gelesen (Skill `bezahlung`, Regel 3) —
 * sonst zeigt jeder, der die Adresse aufruft, eine Dankeseite für einen Kauf, den es nie gab.
 *
 * ── SIE LIEFERT NICHT AUS ───────────────────────────────────────────────────────────────────
 *
 * Die Mails und die Druckdatei macht der Webhook (`api/stripe-webhook` → `druckBestellungMelden`),
 * weil der Käufer den Browser schliessen darf. Diese Seite sagt nur, was passiert — und nennt
 * die Bestellnummer, mit der man ihn zuordnen kann.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "lakatosbandi.com", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PortalBestellungDanke({ searchParams }: Props) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, "ro");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));

  const sitzung = String(sp.s ?? "");
  const s = sitzung ? await getCheckoutSession(sitzung).catch(() => null) : null;
  /* Ein Hundert-Prozent-Gutschein schliesst mit `no_payment_required` — das ist bezahlt
     (Skill `bezahlung`, Regel 6), und die Bestellung ist genauso echt. */
  const bezahlt = !!s && (s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required")
    && String(s.metadata?.art ?? "") === "druck";

  /* Der Korb steht als Vermerk an der Sitzung: `mandant/werk/material/groesse;…` */
  const posten = bezahlt ? String(s!.metadata?.korb ?? "").split(";").filter(Boolean).map(t => t.split("/")) : [];
  const hatDatei = posten.some(p => p[2] === "fisier");
  const hatDruck = posten.some(p => p[2] !== "fisier");
  const summe = s?.amountTotal ?? s?.amountSubtotal ?? null;
  /* Zurück dorthin, wo er herkam — zu dem Künstler, den er gerade gekauft hat. */
  const ziel = posten[0]?.[0] ? P.kuenstler(posten[0][0]) : P.start;

  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-14">
        {!bezahlt ? (
          <p className="m-0 text-[18px] leading-[1.5]">{T.dankeUnklar}</p>
        ) : (
          <>
            <h1 className="m-0 font-serif text-[30px] leading-[1.15] tracking-[-0.01em] sm:text-[38px]">
              {T.dankeTitel}
            </h1>
            <p className="m-0 mt-6 text-[17px] leading-[1.6]">
              {T.dankeNummer}{" "}
              <b className="font-mono tracking-[0.04em]">{bestellNummer(sitzung)}</b>
              {summe !== null ? <span className="text-[#777]"> · {eur(summe, L)}</span> : null}
            </p>
            {/* Beides kann in einer Bestellung stecken — dann stehen beide Sätze da, sonst nur
                der, der zutrifft. Ein Satz über Versand bei einem reinen Datei-Kauf wäre eine
                Lieferung, die nie kommt. */}
            {hatDruck ? <p className="m-0 mt-4 text-[17px] leading-[1.6] text-[#333]">{T.dankeDruck}</p> : null}
            {hatDatei ? <p className="m-0 mt-4 text-[17px] leading-[1.6] text-[#333]">{T.dankeDatei}</p> : null}
            {s?.customerEmail ? (
              <p className="m-0 mt-4 text-[15px] leading-[1.6] text-[#777]">
                {T.dankeMail.replace("{mail}", s.customerEmail)}
              </p>
            ) : null}
            <Link href={ziel}
              className="mt-8 inline-block text-[16px] font-semibold text-[#111] underline underline-offset-4">
              {T.dankeWeiter} →
            </Link>
          </>
        )}
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
