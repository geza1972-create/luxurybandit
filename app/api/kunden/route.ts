import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseKunden, schreibeKunden, slugify, type Kunde } from "@/lib/kunden-store";
import { leseAlleLeads } from "@/lib/joburi-leads";
import { gehaltMitte } from "@/lib/joburi-gehalt";

function median(werte: number[]): number | null {
  const w = werte.filter(n => n > 0).sort((a, b) => a - b);
  if (!w.length) return null;
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : Math.round((w[m - 1] + w[m]) / 2);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE KUNDENVERWALTUNG (Owner 01.09.2026, siehe lib/kunden-store.ts).
 *
 * GET                        (Admin)  → alle Kunden
 * GET ?slug=x                (offen)  → nur das, was der FUNNEL braucht (kein Passwort!)
 * POST { action: "save", … } (Admin)  → anlegen/ändern
 * POST { action: "delete" }  (Admin)  → löschen
 * POST { action: "login", slug, passwort } (offen) → prüft das Kunden-Passwort für /kunde/[slug]
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = s(url.searchParams.get("slug"), 60);

  /* DER FUNNEL DARF DAS PASSWORT NIE SEHEN: Er braucht nur Name, Branche und Platzhalter,
     um sich selbst zu beschriften — das Passwort gehört ausschliesslich `POST login`. */
  if (slug) {
    const alle = await leseKunden();
    const k = alle.find(x => x.slug === slug && x.aktiv);
    if (!k) return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
    const { passwort: _weg, ...oeffentlich } = k;
    return NextResponse.json({ ok: true, kunde: oeffentlich });
  }

  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return NextResponse.json({ ok: true, kunden: await leseKunden() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = s(body.action, 20);

  /* Login prüft nur das eine Passwort und gibt sonst nichts preis — kein Kunden-Slug-Scan,
     keine Fehlermeldung, die verrät, ob der Slug überhaupt existiert. */
  if (action === "login") {
    const slug = s(body.slug, 60);
    const passwort = s(body.passwort, 100);
    const alle = await leseKunden();
    const k = alle.find(x => x.slug === slug && x.aktiv);
    if (!k || !passwort || k.passwort !== passwort) {
      return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  }

  /**
   * DIE KUNDEN-STATISTIK (Owner 01.09.2026: „Der Kunde muss immer die Statistik sehen mit
   * Passwort."). Das Passwort wird bei JEDEM Abruf mitgeschickt statt einer Sitzung — kein
   * Token-System für eine Handvoll Firmenpasswörter, und der Browser des Kunden merkt sich
   * es selbst über das Login-Formular hinweg (siehe app/kunde/[slug]/page.tsx).
   *
   * NUR ANONYME ZAHLEN, KEIN NAME UND KEINE E-MAIL: Die Zustimmung der Kandidat:innen galt
   * einer Kontaktaufnahme durch UNS, nicht der direkten Ansicht durch den Kunden.
   */
  if (action === "stats") {
    const slug = s(body.slug, 60);
    const passwort = s(body.passwort, 100);
    const alleKunden = await leseKunden();
    const k = alleKunden.find(x => x.slug === slug && x.aktiv);
    if (!k || !passwort || k.passwort !== passwort) {
      return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
    }
    const leads = (await leseAlleLeads()).filter(l => l.kunde === slug && !l.test);
    const beispiel = leads.length
      ? leads[leads.length - 1]
      : null;
    return NextResponse.json({
      ok: true,
      kunde: { name: k.name, branche: k.branche },
      summe: {
        gesamt: leads.length,
        mitGehalt: leads.filter(l => !!l.wechselGehalt).length,
        gehaltMedian: median(leads.map(l => gehaltMitte(l.wechselGehalt))),
        offenFuerAngebote: leads.filter(l => l.situation === "employed_open" || l.situation === "employed_satisfied").length,
        aktivSuchend: leads.filter(l => l.situation === "actively_searching").length,
      },
      beispiel: beispiel ? {
        beruf: beispiel.beruf ?? "",
        sprachen: beispiel.sprachen ?? [],
        ort: beispiel.stadt ?? "",
        land: beispiel.land ?? "",
        situation: beispiel.situation ?? "",
        motive: beispiel.motive ?? [],
        wechselGehalt: beispiel.wechselGehalt ?? "",
      } : null,
    });
  }

  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (action === "save") {
    const slug = slugify(s(body.slug, 60) || s(body.name, 60));
    if (!slug) return NextResponse.json({ error: "Name/Slug fehlt." }, { status: 400 });
    const alle = await leseKunden();
    const bisher = alle.find(k => k.slug === slug);
    const neu: Kunde = {
      slug,
      name: s(body.name, 100) || bisher?.name || slug,
      branche: s(body.branche, 200) || bisher?.branche || "",
      berufPlatzhalter: s(body.berufPlatzhalter, 100) || bisher?.berufPlatzhalter || "",
      passwort: s(body.passwort, 100) || bisher?.passwort || "",
      aktiv: body.aktiv !== false,
      erstelltAm: bisher?.erstelltAm || new Date().toISOString(),
    };
    const rest = alle.filter(k => k.slug !== slug);
    if (!(await schreibeKunden([...rest, neu]))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, kunden: [...rest, neu] });
  }

  if (action === "delete") {
    const slug = s(body.slug, 60);
    const alle = await leseKunden();
    const rest = alle.filter(k => k.slug !== slug);
    if (!(await schreibeKunden(rest))) {
      return NextResponse.json({ error: "Löschen fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, kunden: rest });
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
