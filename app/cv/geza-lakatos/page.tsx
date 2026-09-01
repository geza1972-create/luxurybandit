import type { Metadata } from "next";
import PageView from "./PageView";
import InteresseChat from "./InteresseChat";
import Lightbox from "./Lightbox";

/**
 * DAS ÖFFENTLICHE PORTFOLIO VON GEZA LAKATOS (Owner-Auftrag 27.08.2026: „ich brauche eine
 * Landingpage mit den Projekten") — eine eigenständige, öffentliche Seite ohne Login, gedacht
 * zum Verlinken in Bewerbungen. Bewusst KEIN TopNav/SeitenFuss aus dem Produkt: das ist die
 * persönliche Seite des Owners, kein LuxuryBandit-Produkt-Screen.
 *
 * Bilder liegen als echte Dateien unter /public/cv (Live-Screenshots von luxurybandit.com),
 * nicht als Base64 — leichter zu pflegen als die Artifact-Fassung, von der diese Seite den
 * Entwurf übernimmt.
 */

export const metadata: Metadata = {
  title: "Geza Lakatos — UX Dossier",
  description:
    "Senior UX/UI Consultant für Portale, Barrierefreiheit (BITV 2/WCAG) und KI-gestützte Produktentwicklung.",
  robots: { index: false, follow: false },
};

export default function GezaLakatosCvPage() {
  return (
    <>
      <style>{`
        .gl-wrap { max-width: 920px; margin: 0 auto; padding: 0 28px; }
        @media (min-width: 900px) { .gl-wrap { max-width: 1180px; padding: 0 48px; } }
        .gl-page { background: #F3EEE2; color: #1B1A17; font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif; line-height: 1.55; }
        .gl-mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
        .gl-kicker { font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; color: #E1592E; font-weight: 600; }

        .gl-hero { background: #1B1A17; color: #F3EEE2; padding: 56px 0 44px; border-bottom: 4px solid #E1592E; }
        .gl-hero .gl-wrap { display: flex; flex-direction: column; gap: 18px; }
        .gl-name-row { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .gl-portrait { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid #E1592E; flex: 0 0 auto; background: #000; }
        .gl-name { font-family: "Big Shoulders Display", "IBM Plex Sans", sans-serif; font-weight: 900; text-transform: uppercase; font-size: clamp(2.6rem, 8vw, 4.6rem); line-height: 0.92; margin: 0; letter-spacing: 0.01em; text-wrap: balance; }
        .gl-role { font-size: 1.05rem; color: #F3EEE2; opacity: 0.82; font-weight: 500; max-width: 42ch; margin: 0; }
        .gl-contact-row { display: flex; flex-wrap: wrap; gap: 10px 22px; font-family: "IBM Plex Mono", monospace; font-size: 0.82rem; color: #F3EEE2; opacity: 0.75; padding-top: 6px; border-top: 1px solid rgba(243,238,226,0.18); }

        .gl-section { padding: 52px 0; border-bottom: 1px solid #DCD3BF; }
        .gl-section:last-of-type { border-bottom: none; }
        .gl-section-head { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
        .gl-section-title { font-family: "Big Shoulders Display", sans-serif; font-weight: 700; text-transform: uppercase; font-size: clamp(1.5rem, 4vw, 2.05rem); margin: 0; letter-spacing: 0.01em; }
        .gl-section-note { color: #8A8478; font-size: 0.94rem; max-width: 62ch; margin: 0; }

        .gl-case { background: #FFFFFF; border: 1px solid #DCD3BF; border-left: 5px solid #E1592E; border-radius: 4px; padding: 26px 28px; display: grid; grid-template-columns: auto 1fr; gap: 6px 22px; margin-bottom: 20px; }
        .gl-case:last-child { margin-bottom: 0; }
        .gl-case-code { font-family: "IBM Plex Mono", monospace; font-size: 0.78rem; color: #8A8478; grid-column: 1; align-self: start; padding-top: 3px; white-space: nowrap; }
        .gl-case-body { grid-column: 2; min-width: 0; }
        .gl-case h3 { margin: 0 0 4px; font-size: 1.18rem; font-weight: 700; }
        .gl-case .gl-org { color: #E1592E; font-weight: 600; font-size: 0.92rem; margin-bottom: 10px; }
        .gl-case p { margin: 0 0 12px; color: #38352E; }
        .gl-case-shot { display: block; width: 100%; max-width: 480px; border-radius: 4px; border: 1px solid #DCD3BF; margin: 4px 0 14px; }
        .gl-case-shots { display: flex; gap: 10px; margin: 4px 0 14px; overflow-x: auto; padding-bottom: 4px; min-width: 0; max-width: 100%; }
        .gl-case-shots .gl-case-shot { flex: 0 0 auto; width: 240px; max-width: 240px; height: 150px; object-fit: cover; object-position: top left; margin: 0; }
        .gl-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .gl-tag { font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; letter-spacing: 0.03em; background: #EAE2CE; color: #38352E; padding: 4px 10px; border-radius: 3px; white-space: nowrap; }
        @media (max-width: 560px) { .gl-case { grid-template-columns: 1fr; } .gl-case-code, .gl-case-body { grid-column: 1; } }

        .gl-lb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
        @media (max-width: 620px) { .gl-lb-stats { grid-template-columns: repeat(2, 1fr); } }
        .gl-lb-stat { background: #FFFFFF; border: 1px solid #DCD3BF; border-radius: 4px; padding: 14px 16px; font-size: 0.82rem; color: #38352E; display: flex; flex-direction: column; gap: 2px; }
        .gl-lb-stat b { font-family: "Big Shoulders Display", sans-serif; font-size: 1.8rem; font-weight: 900; color: #E1592E; line-height: 1; }
        .gl-lb-pipeline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 4px; margin-bottom: 24px; font-family: "IBM Plex Mono", monospace; font-size: 0.74rem; color: #38352E; }
        .gl-lb-pipeline span:not(.gl-lb-arrow) { background: #EAE2CE; padding: 5px 10px; border-radius: 3px; white-space: nowrap; }
        .gl-lb-arrow { color: #E1592E; font-weight: 700; }
        .gl-lb-panel { background: #1B1A17; color: #F3EEE2; border-radius: 6px; padding: 34px; display: flex; flex-direction: column; gap: 26px; }
        .gl-lb-text { max-width: 72ch; }
        .gl-lb-text, .gl-lb-shots { min-width: 0; }
        .gl-lb-text h3 { font-family: "Big Shoulders Display", sans-serif; font-weight: 900; text-transform: uppercase; font-size: 1.9rem; margin: 6px 0 12px; }
        .gl-orange { color: #E1592E; }
        .gl-lb-text p { color: #F3EEE2; opacity: 0.85; margin: 0 0 14px; }
        .gl-lb-text .gl-tag { background: rgba(243,238,226,0.1); color: #F3EEE2; }
        .gl-lb-shots { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; min-width: 0; max-width: 100%; }
        .gl-phone { flex: 0 0 auto; width: 132px; border-radius: 16px; overflow: hidden; border: 3px solid rgba(243,238,226,0.25); background: #000; box-shadow: 0 14px 30px rgba(0,0,0,0.35); }
        .gl-phone img { display: block; width: 100%; height: auto; }

        .gl-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 620px) { .gl-grid { grid-template-columns: 1fr; } }
        @media (min-width: 900px) { .gl-grid { grid-template-columns: repeat(3, 1fr); } }
        .gl-mini { background: #FFFFFF; border: 1px solid #DCD3BF; border-radius: 4px; padding: 18px 20px; min-width: 0; }
        .gl-mini-shot { display: block; width: 100%; border-radius: 3px; border: 1px solid #DCD3BF; margin-bottom: 12px; }
        .gl-mini-shots { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; min-width: 0; max-width: 100%; }
        .gl-mini-shots .gl-mini-shot { margin-bottom: 0; flex: 0 0 auto; width: 240px; max-width: 240px; height: 150px; object-fit: cover; object-position: top left; }
        .gl-case-shots img, .gl-mini-shots img, .gl-lb-shots img { cursor: zoom-in; }
        .gl-mini h4 { margin: 0 0 4px; font-size: 1rem; font-weight: 700; }
        .gl-mini .gl-meta { font-family: "IBM Plex Mono", monospace; font-size: 0.72rem; color: #8A8478; margin-bottom: 8px; }
        .gl-mini p { margin: 0; color: #38352E; font-size: 0.9rem; }
        .gl-mini .gl-flag { display: inline-block; margin-top: 10px; font-family: "IBM Plex Mono", monospace; font-size: 0.68rem; color: #8A8478; border: 1px solid #DCD3BF; padding: 2px 8px; border-radius: 3px; }

        .gl-skills-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .gl-skill { font-size: 0.86rem; font-weight: 600; background: #EAE2CE; color: #1B1A17; padding: 7px 14px; border-radius: 20px; }

        .gl-footer { background: #1B1A17; color: #F3EEE2; padding: 40px 0 34px; }
        .gl-footer .gl-wrap { display: flex; flex-direction: column; gap: 22px; }
        .gl-cta { display: inline-block; background: #E1592E; color: #1B1A17; font-weight: 700; text-decoration: none; padding: 12px 22px; border-radius: 30px; font-size: 0.95rem; border: none; cursor: pointer; font-family: inherit; }
        .gl-cta:disabled { opacity: 0.5; cursor: default; }
        .gl-foot-meta { font-family: "IBM Plex Mono", monospace; font-size: 0.76rem; opacity: 0.65; }

        .gl-interesse { display: flex; flex-direction: column; gap: 12px; }
        .gl-interesse-frage { margin: 0; font-weight: 700; font-size: 1.05rem; }
        .gl-interesse-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .gl-interesse-input { flex: 1 1 180px; padding: 11px 14px; border-radius: 8px; border: 1px solid rgba(243,238,226,0.3); background: rgba(243,238,226,0.06); color: #F3EEE2; font-size: 0.92rem; font-family: inherit; }
        .gl-interesse-input::placeholder { color: rgba(243,238,226,0.45); }
        .gl-interesse-danke { margin: 0; font-weight: 700; color: #E1592E; font-size: 1.05rem; }
        .gl-interesse-fehler { margin: 0; font-size: 0.82rem; opacity: 0.75; }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Big+Shoulders+Display:wght@700;900&display=swap"
      />

      <div className="gl-page lb-portfolio">
        <PageView />
        <Lightbox />
        <header className="gl-hero">
          <div className="gl-wrap">
            <div className="gl-kicker">Dossier — 2026 · UX / UI Consultant</div>
            <div className="gl-name-row">
              <img className="gl-portrait" src="/cv/geza-portrait.png" alt="Geza Lakatos" />
              <h1 className="gl-name">
                Geza
                <br />
                Lakatos
              </h1>
            </div>
            <p className="gl-role">
              Senior UX/UI Consultant für Portale, Barrierefreiheit (BITV 2 / WCAG) und
              KI-gestützte Produktentwicklung — über 20 Jahre Erfahrung, davon mehrere Jahre
              direkt für Bundesbehörden.
            </p>
            <div className="gl-contact-row">
              <span>Deutsch (C2) · Englisch (C1) · Rumänisch (C2) · Ungarisch (B2)</span>
              <span>Berlin</span>
            </div>
          </div>
        </header>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">01 · Öffentlicher Sektor</div>
              <h2 className="gl-section-title">Portale für Bundesbehörden</h2>
              <p className="gl-section-note">
                Zwei Mehrjahresprojekte mit klarem Auftrag: komplexe Fachprozesse in
                nachprüfbar barrierefreie, entwicklungsreife Oberflächen übersetzen.
              </p>
            </div>

            <div className="gl-case">
              <div className="gl-case-code">
                2022–2024
                <br />
                Berlin
              </div>
              <div className="gl-case-body">
                <h3>Nationaler Datenatlas</h3>
                <div className="gl-org">Bundesdruckerei Gruppe GmbH / Bundesministerium der Finanzen</div>
                <p>
                  UX-Leitung für eine Datenplattform des Bundes: Einführung von UX-Prozessen,
                  Durchführung von Fach-Workshops, Entwicklung metadatenbasierter Prototypen
                  und Gestaltung der visuellen Identität der Plattform — von der ersten
                  Konzeption bis zur entwicklungsreifen Umsetzung in Figma.
                </p>
                <div className="gl-case-shots">
                  <img className="gl-case-shot" src="/cv/case-bdr-atlas.png" alt="UX-Konzept des Datenatlas für die Bundesdruckerei / das Bundesministerium der Finanzen" />
                  <img className="gl-case-shot" src="/cv/case-bdr-screens.png" alt="Designsystem und Bildschirme des Datenatlas, Figma" />
                </div>
                <div className="gl-tags">
                  <span className="gl-tag">UX-Strategie</span>
                  <span className="gl-tag">Metadaten-Prototyping</span>
                  <span className="gl-tag">Design-System</span>
                  <span className="gl-tag">Workshop-Moderation</span>
                </div>
              </div>
            </div>

            <div className="gl-case">
              <div className="gl-case-code">
                2021–2022
                <br />
                Nürnberg
              </div>
              <div className="gl-case-body">
                <h3>Internes SharePoint-Portal</h3>
                <div className="gl-org">Bundesagentur für Arbeit</div>
                <p>
                  UX-Konzeption eines internen Portals mit dem expliziten Auftrag,
                  Benutzerfreundlichkeit und Barrierefreiheit gemäss BITV 2 sicherzustellen —
                  Standard-Konformität als Projektziel, nicht als Nachtrag.
                </p>
                <div className="gl-case-shots">
                  <img className="gl-case-shot" src="/cv/case-ba-intranet.png" alt="UX-Konzept des internen Social Intranets der Bundesagentur für Arbeit" />
                  <img className="gl-case-shot" src="/cv/case-ba-flows.png" alt="Annotierte User Flows des Social Intranets" />
                </div>
                <div className="gl-tags">
                  <span className="gl-tag">BITV 2 / WCAG</span>
                  <span className="gl-tag">Microsoft SharePoint</span>
                  <span className="gl-tag">Internes Portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">02 · Eigene Plattform, live</div>
              <h2 className="gl-section-title">LuxuryBandit</h2>
              <p className="gl-section-note">
                Keine einzelne App — eine Plattform mit sechs eigenständigen KI-Funnels,
                einer gemeinsamen Kasse, einer Übersetzungs-Engine für sieben Sprachen und
                einem eigenen Analytics-Unterbau. Konzept, UX, Architektur und Umsetzung
                komplett von mir, mit KI-gestützter Entwicklung direkt im Terminal.
              </p>
              <p className="gl-section-note">
                <b>Individuelles Marketing ohne Agentur-Overhead.</b> Luxurybandit
                entwickelt schnell maßgeschneiderte Funnels, Tests und digitale Lösungen.
                Durch einen schlanken, KI-gestützten Prozess können wir auch mit kleineren
                Budgets arbeiten — und erst dann skalieren, wenn die Daten zeigen, dass
                etwas funktioniert.
              </p>
            </div>

            <div className="gl-lb-stats">
              <div className="gl-lb-stat"><b>6</b>KI-Funnels live</div>
              <div className="gl-lb-stat"><b>7</b>Sprachen zur Laufzeit</div>
              <div className="gl-lb-stat"><b>1</b>gemeinsame Kasse &amp; Guthaben-System</div>
              <div className="gl-lb-stat"><b>1</b>Analytics-Dashboard für alle Funnels</div>
            </div>

            <div className="gl-lb-pipeline">
              <span>Meta-Anzeige</span><span className="gl-lb-arrow">→</span>
              <span>Landingpage</span><span className="gl-lb-arrow">→</span>
              <span>Kasse / Guthaben</span><span className="gl-lb-arrow">→</span>
              <span>KI-Erzeugung</span><span className="gl-lb-arrow">→</span>
              <span>Auslieferung</span><span className="gl-lb-arrow">→</span>
              <span>Admin &amp; Insights</span>
            </div>

            <div className="gl-lb-panel">
              <div className="gl-lb-text">
                <a className="gl-kicker" style={{ color: "#E1592E" }} href="https://luxurybandit.com" target="_blank" rel="noopener noreferrer">
                  luxurybandit.com ↗
                </a>
                <h3>
                  Sechs <span className="gl-orange">Funnels</span>, eine Plattform
                </h3>
                <p>
                  <b>Live:</b> ein KI-Interview-Trichter für Jobsuchende (gemessener
                  Deutschtest statt Selbstauskunft), ein KI-Pre-Screening für Recruiter
                  (Lebenslauf, Stellenanzeige und ein geführtes Gespräch zu einem
                  Anforderungs-Abgleich verbunden), personalisierte KI-Video-Geschenke
                  (Geburtstag), ein 30-Tage-Coaching-Programm mit KI-Zukunftsfilm,
                  eine KI-Jury, die Geschäftsideen live gegeneinander verhandelt, und eine
                  virtuelle Anprobe für Online-Shops.
                </p>
                <p>
                  <b>KI-Generatoren, produktweise orchestriert:</b> nicht ein Modell für
                  alles, sondern je Produkt der passende Anbieter — Bildgenerierung,
                  Video-Avatare, virtuelle Anproben und Sprachsynthese laufen über
                  verschiedene APIs, serverseitig zusammengeführt zu einem Ergebnis, das
                  der Kunde in einem Schritt kauft — Konzept und Umsetzung komplett von mir.
                </p>
                <p>
                  <b>Live:</b> ein individuelles Recruiting-Tool für passive
                  Bewerber:innen, die für das richtige Angebot wechseln würden — 9 Fragen,
                  kein Lebenslauf, kein Name, Kontaktaufnahme nur bei echtem Match.
                  Aufsetzbar als eigenständiger Funnel je Zielgruppe, inklusive Auswertung
                  und Statistiken zu Rücklauf und Antworten. Genau damit kann ich auch
                  Unternehmen helfen, passive Kandidat:innen für offene Stellen zu finden.{" "}
                  <a
                    style={{ color: "#E1592E" }}
                    href="https://luxurybandit.com/admin/recruiting?light=1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Admin-Auswertung ansehen ↗
                  </a>
                </p>
                <p>
                  <b>Eigenes Design-System:</b> eine dokumentierte CI-Bibliothek als
                  verbindliche Quelle — Farb-Tokens, zwei Schriften mit klaren Rollen und
                  wiederverwendbare Bausteine (Karte, Knopf, Eingabe, Dialog). Jede
                  Oberfläche wird daraus gebaut, statt Regeln pro Seite neu zu erfinden;
                  eine Änderung an der Bibliothek wirkt in allen Funnels zugleich.
                </p>
                <p>
                  <b>Dahinter:</b> eine eigene Analytics-Pipeline (Funnel-Events von
                  „Anzeige gesehen" bis „bezahlt", pro Produkt vergleichbar, mit Meta
                  Conversions API dedupliziert), Admin-Werkzeuge für Kampagnen, Kandidaten
                  und Uploads, und eine Laufzeit-Übersetzung, die jeden Text ohne manuelle
                  Pflege in sieben Sprachen hält.
                </p>
                <div className="gl-tags">
                  <span className="gl-tag">Claude Code</span>
                  <span className="gl-tag">React / Next.js</span>
                  <span className="gl-tag">Figma</span>
                  <span className="gl-tag">OpenAI</span>
                  <span className="gl-tag">HeyGen</span>
                  <span className="gl-tag">Pixverse / fal Kling</span>
                  <span className="gl-tag">FASHN</span>
                  <span className="gl-tag">Stripe Checkout</span>
                  <span className="gl-tag">Meta Pixel + CAPI</span>
                  <span className="gl-tag">Eigenes Analytics</span>
                  <span className="gl-tag">Design-System / CI</span>
                </div>
              </div>
              <div className="gl-lb-shots">
                <div className="gl-phone">
                  <img src="/cv/lb-home.png" alt="LuxuryBandit Startseite mit den Funnel-Produkten" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-jobs.png" alt="KI-Interview-Chat des Job-Match-Funnels" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-birthday.png" alt="Personalisierte Geburtstags-Videokarte" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-david.png" alt="KI-Pre-Screening für Recruiter, geführter Anforderungs-Abgleich" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-tryon.png" alt="Virtuelle Anprobe für Online-Shops, Off-Duty-Kollektion" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-pricing.png" alt="Preisseite mit Abo-Stufen, Bezahlung über Stripe" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-ci.png" alt="Eigene CI-Bibliothek: Farb-Tokens, Schriftregeln und Bausteine" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-david.png" alt="LB · David — KI-gestütztes Pre-Screening im Recruiter-Dialog" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">03 · Weitere Projekte</div>
              <h2 className="gl-section-title">Auswahl übriger Arbeit</h2>
            </div>
            <div className="gl-grid">
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-festo.png" alt="Smartenance — Wartungsmanager-Plattform für Festo, Desktop und Mobile" />
                  <img className="gl-mini-shot" src="/cv/case-festo-hifi.png" alt="High-Fidelity-Screens des Wartungsmanagers in Figma" />
                </div>
                <h4>Smartenance — Wartungsmanager</h4>
                <div className="gl-meta">2020–2021 · Festo, Esslingen</div>
                <p>
                  Konzept, UX und High-Fidelity-Design für einen digitalen Wartungsmanager,
                  der mehrere analoge Einzeltools (Logbuch, Auswertung, Dokumentation) in
                  einer responsiven Web-App für Desktop, Tablet und Smartphone vereint —
                  von der User Journey über Wireframes bis zum fertigen Interface.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-verivox.png" alt="UX/UI-Konzept des Verivox-Webportals und der Mobile App" />
                  <img className="gl-mini-shot" src="/cv/case-verivox-hifi.png" alt="High-Fidelity-Design des Hypothekenrechners" />
                </div>
                <h4>Vergleichsportal &amp; App</h4>
                <div className="gl-meta">2017–2018 · Verivox, Heidelberg</div>
                <p>
                  UX/UI für ein Webportal und eine begleitende App, die Nutzer zu einem
                  passenden Tarif führen — Zielgruppen-Research, Sitemaps, Klick-Dummys,
                  High-Fidelity-Design und -Guidelines bis zur App-Umsetzung.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-nutrycoach.png" alt="NutryCoach.ai — KI-Ernährungscoaching-Plattform, Startseite" />
                  <img className="gl-mini-shot" src="/cv/case-nutrycoach-mahlzeit.png" alt="KI-Foto-Analyse einer Mahlzeit in NutryCoach.ai" />
                </div>
                <h4>Nutrycoach</h4>
                <div className="gl-meta">2025 · Ärztegemeinschaft, Ludwigshafen</div>
                <p>
                  KI-Ernährungscoaching-Plattform für die Praxis: Produktstruktur, User Flows,
                  rollenbasierte Dashboards für Patienten, Coaches und Praxis-Admins,
                  KI-gestützte Foto-Analyse von Mahlzeiten.
                </p>
              </div>
              <div className="gl-mini">
                <h4>UX-Lehre &amp; Mentoring</h4>
                <div className="gl-meta">2020–2024 · UX Design Institute, Berlin</div>
                <p>
                  Über 200 Studierende gecoacht, Figma-Workflows und UX-Methodik mit
                  menschlichem Fokus vermittelt.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-db.png" alt="Internes Serviceportal der Deutschen Bahn AG" />
                  <img className="gl-mini-shot" src="/cv/case-db-workshop.png" alt="Design-Thinking-Workshop mit dem Fachbereich, Prozessdiagramm" />
                </div>
                <h4>Serviceportal</h4>
                <div className="gl-meta">2018–2020 · Deutsche Bahn AG, Frankfurt</div>
                <p>
                  Verbesserung der UX eines internen E-Commerce-Portals; Design-Thinking-
                  Workshops mit dem Fachbereich, Wireframes und interaktive Prototypen für
                  Stakeholder-Workshops.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-1und1.png" alt="UI-Konzeption für 1&1, Cloud-Server-Landingpage" />
                </div>
                <h4>UI-Konzeption &amp; Kampagnen</h4>
                <div className="gl-meta">2010–2014 · Web.de &amp; 1&amp;1, Karlsruhe</div>
                <p>
                  Oberflächenkonzepte und Umsetzung für die wöchentliche Online-Kampagne:
                  Banner, Teaser und Landingpages für den gesamten Kundenbereich.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-sportstech.png" alt="Shop- und Markendesign für Sportstech" />
                </div>
                <h4>Marken- &amp; Shop-Design</h4>
                <div className="gl-meta">2014–2016 · Sportstech &amp; Icartech, Berlin</div>
                <p>
                  Leitung der Markenerweiterung; Shop- und eBay/Amazon-Templates für
                  Desktop und Mobile.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">04 · Werkzeuge &amp; Kompetenzen</div>
              <h2 className="gl-section-title">Wie ich arbeite</h2>
            </div>
            <div className="gl-skills-row">
              <span className="gl-skill">Figma</span>
              <span className="gl-skill">Designsysteme</span>
              <span className="gl-skill">BITV 2 / WCAG</span>
              <span className="gl-skill">UX Research &amp; Prototyping</span>
              <span className="gl-skill">Workshop-Moderation</span>
              <span className="gl-skill">Claude &amp; Claude Code</span>
              <span className="gl-skill">React / Vite</span>
              <span className="gl-skill">Agile Zusammenarbeit</span>
            </div>
          </div>
        </section>

        <footer className="gl-footer">
          <div className="gl-wrap">
            <InteresseChat />
            <div className="gl-foot-meta">Dossier zusammengestellt für Bewerbungen 2026 · luxurybandit.com</div>
          </div>
        </footer>
      </div>
    </>
  );
}
