import type { Metadata } from "next";
import PageView from "./PageView";
import InteresseChat from "./InteresseChat";
import Lightbox from "./Lightbox";
import { ARMEE_SPOT, ARMEE_SPOT_POSTER } from "@/lib/demo-armee";

/**
 * DAS ÖFFENTLICHE PORTFOLIO VON GEZA LAKATOS (Owner-Auftrag 27.08.2026: „ich brauche eine
 * Landingpage mit den Projekten") — eine eigenständige, öffentliche Seite ohne Login, gedacht
 * zum Verlinken in Bewerbungen. Bewusst KEIN TopNav/SeitenFuss aus dem Produkt: das ist die
 * persönliche Seite des Owners, kein Produkt-Screen.
 *
 * SEIT 18.09.2026 AUF ENGLISCH (Owner: „die seite muss auf englisch sein" — die Bewerbungen
 * laufen international, z. B. Dubai-Remote-Mandate); ausserdem lakatosbandi.com als neuestes
 * Projekt (Owner: „lakatosbandi eintragen als projekt") und der Portalname VersusForge.
 *
 * Bilder liegen als echte Dateien unter /public/cv (Live-Screenshots), nicht als Base64 —
 * leichter zu pflegen als die Artifact-Fassung, von der diese Seite den Entwurf übernimmt.
 */

export const metadata: Metadata = {
  title: "Geza Lakatos — UX Dossier",
  description:
    "Senior UX/UI consultant for portals, accessibility (BITV 2/WCAG) and AI-assisted product development.",
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
        .gl-lb-shots { display: flex; align-items: flex-start; gap: 14px; overflow-x: auto; padding-bottom: 6px; min-width: 0; max-width: 100%; }
        /* Alle Telefone im festen 440:782-Format der Topic-Shots (Owner 18.09.2026: "die
           sind alle abgeschnitten" — vorher streckte der Flex-Streifen jeden Rahmen auf
           die Hoehe des hoechsten Bildes, unten blieb Schwarz). Bilder fuellen von OBEN. */
        .gl-phone { flex: 0 0 auto; width: 132px; aspect-ratio: 440 / 782; border-radius: 16px; overflow: hidden; border: 3px solid rgba(243,238,226,0.25); background: #000; box-shadow: 0 14px 30px rgba(0,0,0,0.35); }
        .gl-phone img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }

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
        /* Hochformat-Video in einer Raster-Karte (UPA-Spot ist 9:16 — Owner 18.09.2026:
           "das video ist doch hochformat und soll auch full funktionieren"): natuerliches
           Seitenverhaeltnis, native Bedienelemente inkl. Vollbild, nie die 240x150-Querbox. */
        /* Der Spot ist 3:4 (768x1024) — Verhaeltnis der DATEI, und contain statt
           cover: ein Video wird NIE beschnitten (Owner 18.09.2026); breit genug, dass
           Chrome in der Leiste auch das Vollbild-Symbol zeigt. */
        .gl-mini-hoch { display: block; width: 280px; max-width: 100%; aspect-ratio: 3 / 4; object-fit: contain; border-radius: 8px; border: 1px solid #DCD3BF; background: #000; margin-bottom: 12px; }
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
              Senior UX/UI consultant for portals, accessibility (BITV 2 / WCAG) and
              AI-assisted product development — 20+ years of experience, including several
              years working directly for German federal agencies.
            </p>
            <div className="gl-contact-row">
              <span>German (C2) · English (C1) · Romanian (C2) · Hungarian (B2)</span>
              <span>Timisoara, Romania · remote</span>
            </div>
          </div>
        </header>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">01 · Own platform, live</div>
              <h2 className="gl-section-title">VersusForge · Marketing Engine</h2>
              <p className="gl-section-note">
                Not a single app — a platform with six independent AI funnels, one shared
                checkout, a translation engine for seven languages and its own analytics
                layer. Concept, UX, architecture and implementation entirely by me, built
                with AI-assisted development straight from the terminal.
              </p>
              <p className="gl-section-note">
                <b>Custom marketing without agency overhead.</b> VersusForge rapidly
                builds tailored funnels, tests and digital solutions. A lean, AI-assisted
                process makes smaller budgets workable too — scaling only once the data
                shows something works.
              </p>
            </div>

            <div className="gl-lb-stats">
              <div className="gl-lb-stat"><b>Several</b>AI funnels live</div>
              <div className="gl-lb-stat"><b>7</b>languages at runtime</div>
              <div className="gl-lb-stat"><b>1</b>shared checkout &amp; credit system</div>
              <div className="gl-lb-stat"><b>1</b>analytics dashboard for all funnels</div>
            </div>

            <div className="gl-lb-pipeline">
              <span>Meta ad</span><span className="gl-lb-arrow">→</span>
              <span>Landing page</span><span className="gl-lb-arrow">→</span>
              <span>Checkout / credits</span><span className="gl-lb-arrow">→</span>
              <span>AI generation</span><span className="gl-lb-arrow">→</span>
              <span>Delivery</span><span className="gl-lb-arrow">→</span>
              <span>Admin &amp; insights</span>
            </div>

            <div className="gl-lb-panel">
              <div className="gl-lb-text">
                <a className="gl-kicker" style={{ color: "#E1592E" }} href="https://versusforge.com" target="_blank" rel="noopener noreferrer">
                  versusforge.com ↗
                </a>
                <h3>
                  Several <span className="gl-orange">funnels</span>, one platform
                </h3>
                <p>
                  <b>Live:</b> an AI interview funnel for job seekers (a measured German
                  test instead of self-assessment), an AI pre-screening for recruiters
                  (CV, job ad and a guided conversation combined into a requirements
                  match), personalised AI video gifts (birthday), a 30-day coaching
                  programme with an AI future film, an AI jury that negotiates business
                  ideas live against each other, and a virtual try-on for online shops.
                </p>
                <p>
                  <b>AI generators, orchestrated per product:</b> not one model for
                  everything, but the right provider per product — image generation, video
                  avatars, virtual try-ons and speech synthesis run across different APIs,
                  merged server-side into one result the customer buys in a single step —
                  concept and implementation entirely by me.
                </p>
                <p>
                  <b>Live, as VersusForge:</b> four questions — and the client has their
                  hook, ready-to-run ad copy and the playbook for building the funnel
                  behind it. The same modular principle powers other funnels too, e.g. a
                  custom recruiting tool for passive candidates who would switch for the
                  right offer — 9 questions, no CV, no name, contact only on a real match.
                  That is exactly how I can also help companies find passive candidates
                  for open roles.{" "}
                  {/* Owner 18.09.2026: Admin-Link raus (hinter dem PIN-Tor "geht er
                      nicht" fuer Fremde); das Live-Beispiel ist die geteilte Demo. */}
                  <a
                    style={{ color: "#E1592E" }}
                    href="https://versusforge.com/demo/bw-7f3a2c?lang=en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View live example ↗
                  </a>
                </p>
                <p>
                  <b>Own design system:</b> a documented CI library as the single source
                  of truth — colour tokens, two typefaces with clear roles and reusable
                  building blocks (card, button, input, dialog). Every screen is built
                  from it instead of reinventing rules per page; one change to the library
                  propagates to every funnel at once.
                </p>
                <p>
                  <b>Under the hood:</b> a custom analytics pipeline (funnel events from
                  &quot;ad seen&quot; to &quot;paid&quot;, comparable per product,
                  deduplicated via the Meta Conversions API), admin tools for campaigns,
                  candidates and uploads, and runtime translation that keeps every text in
                  seven languages without manual maintenance.
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
                  <span className="gl-tag">Own analytics</span>
                  <span className="gl-tag">Design system / CI</span>
                </div>
              </div>
              {/* FRISCHE TOPIC-SCREENSHOTS (Owner 18.09.2026: "mach einen neuen
                  screenshot von der seite versusforge und ersetze das" + "und mach
                  screenshots von den topics rein") — alle live geschossen (Chrome
                  headless, 390er-Breite, englisch), statt der alten LuxuryBandit-Staende. */}
              <div className="gl-lb-shots">
                <div className="gl-phone">
                  <img src="/cv/vf-home.png" alt="VersusForge home page with the funnel products" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-academy.png" alt="United Peace Academy — recruiting funnel, advert card" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-david.png" alt="David — AI pre-screening topic page" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-jobs.png" alt="Jobs funnel — AI interview chat" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-birthday.png" alt="Personalised birthday video gift, topic page" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-futureself.png" alt="Future Self Program — AI future film and 30-day programme" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-tryon.png" alt="Virtual try-on for online shops, topic page" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/vf-resume.png" alt="Resume generator topic page" />
                </div>
                <div className="gl-phone">
                  <img src="/cv/lb-ci.png" alt="Own CI library: colour tokens, type rules and building blocks" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">02 · More projects</div>
              <h2 className="gl-section-title">Selected other work</h2>
            </div>
            <div className="gl-grid">
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-lakatosbandi.png" alt="Artist Fair — art marketplace lakatosbandi.com, home page with Living Poster gallery" />
                  <img className="gl-mini-shot" src="/cv/case-lakatosbandi-werk.png" alt="Artist page with agent chat and Living Poster shop" />
                </div>
                <h4>Artist Fair — art marketplace</h4>
                <div className="gl-meta">2026 · own project · lakatosbandi.com</div>
                <p>
                  Print-on-demand art marketplace in three languages: artist onboarding
                  funnel, a per-artist agent chat, Stripe checkout and the &quot;Living
                  Poster&quot; — a printed poster that plays music and tells the
                  work&apos;s story when scanned. Concept, UX and implementation entirely
                  by me.{" "}
                  <a
                    style={{ color: "#E1592E" }}
                    href="https://lakatosbandi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit live ↗
                  </a>
                </p>
              </div>
              {/* UNITED PEACE ACADEMY STATT DES VERSUSFORGE-SPOTS (Owner 18.09.2026, mit
                  Bild des posterlosen Players: "hier machst du das projekt rein United...")
                  — VersusForge hat oben schon die eigene Sektion; Video und Standbild
                  kommen aus der EINEN Quelle (Memory `landingpage-video-ist-kachel-video`). */}
              <div className="gl-mini">
                <video
                  className="gl-mini-hoch"
                  src={ARMEE_SPOT}
                  poster={ARMEE_SPOT_POSTER}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label="United Peace Academy — recruiting spot"
                />
                <h4>United Peace Academy — recruiting funnel</h4>
                <div className="gl-meta">2026 · own project · white-label demo</div>
                <p>
                  A recruiting advert people actually finish: candidates upload one selfie
                  and see themselves in the job — as a video. For the web, for screens on
                  site, for projections. One brand swap, and the same funnel recruits for
                  any employer. Concept, UX and implementation entirely by me.{" "}
                  <a
                    style={{ color: "#E1592E" }}
                    href="https://versusforge.com/academy/en"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View live ↗
                  </a>
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-bdr-atlas.png" alt="UX concept of the Data Atlas for Bundesdruckerei / the Federal Ministry of Finance" />
                  <img className="gl-mini-shot" src="/cv/case-bdr-screens.png" alt="Design system and screens of the Data Atlas, Figma" />
                </div>
                <h4>National Data Atlas</h4>
                <div className="gl-meta">2022–2024 · Bundesdruckerei / Federal Ministry of Finance, Berlin</div>
                <p>
                  UX lead for a federal data platform: introduced UX processes, ran
                  specialist workshops, developed metadata-based prototypes and shaped the
                  platform&apos;s visual identity — from first concept to
                  development-ready delivery in Figma.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-ba-intranet.png" alt="UX concept of the internal social intranet of the Federal Employment Agency" />
                  <img className="gl-mini-shot" src="/cv/case-ba-flows.png" alt="Annotated user flows of the social intranet" />
                </div>
                <h4>Internal SharePoint portal</h4>
                <div className="gl-meta">2021–2022 · Bundesagentur für Arbeit, Nürnberg</div>
                <p>
                  UX concept for an internal portal with the explicit mandate to ensure
                  usability and accessibility according to BITV 2 — standards compliance
                  as a project goal, not an afterthought.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-nutrycoach.png" alt="NutryCoach.ai — AI nutrition coaching platform, home page" />
                  <img className="gl-mini-shot" src="/cv/case-nutrycoach-mahlzeit.png" alt="AI photo analysis of a meal in NutryCoach.ai" />
                </div>
                <h4>Nutrycoach</h4>
                <div className="gl-meta">2025 · medical practice group, Ludwigshafen</div>
                <p>
                  AI nutrition coaching platform for the practice: product structure, user
                  flows, role-based dashboards for patients, coaches and practice admins,
                  AI-assisted photo analysis of meals.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-festo.png" alt="Smartenance — maintenance manager platform for Festo, desktop and mobile" />
                  <img className="gl-mini-shot" src="/cv/case-festo-hifi.png" alt="High-fidelity screens of the maintenance manager in Figma" />
                </div>
                <h4>Smartenance — maintenance manager</h4>
                <div className="gl-meta">2020–2021 · Festo, Esslingen</div>
                <p>
                  Concept, UX and high-fidelity design for a digital maintenance manager
                  that unifies several analogue tools (logbook, reporting, documentation)
                  in one responsive web app for desktop, tablet and phone — from user
                  journey and wireframes to the finished interface.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-verivox.png" alt="UX/UI concept of the Verivox web portal and mobile app" />
                  <img className="gl-mini-shot" src="/cv/case-verivox-hifi.png" alt="High-fidelity design of the mortgage calculator" />
                </div>
                <h4>Comparison portal &amp; app</h4>
                <div className="gl-meta">2017–2018 · Verivox, Heidelberg</div>
                <p>
                  UX/UI for a web portal and companion app that guide users to the right
                  tariff — audience research, sitemaps, click dummies, high-fidelity
                  design and guidelines through to app implementation.
                </p>
              </div>
              <div className="gl-mini">
                <h4>UX teaching &amp; mentoring</h4>
                <div className="gl-meta">2020–2024 · UX Design Institute, Berlin</div>
                <p>
                  Coached 200+ students and professionals, teaching Figma workflows and
                  human-centred UX methodology.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-db.png" alt="Internal service portal of Deutsche Bahn AG" />
                  <img className="gl-mini-shot" src="/cv/case-db-workshop.png" alt="Design-thinking workshop with the business unit, process diagram" />
                </div>
                <h4>Service portal</h4>
                <div className="gl-meta">2018–2020 · Deutsche Bahn AG, Frankfurt</div>
                <p>
                  Improved the UX of an internal e-commerce portal; design-thinking
                  workshops with the business unit, wireframes and interactive prototypes
                  for stakeholder workshops.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-1und1.png" alt="UI concept for 1&1, cloud-server landing page" />
                </div>
                <h4>UI concepts &amp; campaigns</h4>
                <div className="gl-meta">2010–2014 · Web.de &amp; 1&amp;1, Karlsruhe</div>
                <p>
                  Interface concepts and delivery for the weekly online campaign: banners,
                  teasers and landing pages across the entire customer area.
                </p>
              </div>
              <div className="gl-mini">
                <div className="gl-mini-shots">
                  <img className="gl-mini-shot" src="/cv/case-sportstech.png" alt="Shop and brand design for Sportstech" />
                </div>
                <h4>Brand &amp; shop design</h4>
                <div className="gl-meta">2014–2016 · Sportstech &amp; Icartech, Berlin</div>
                <p>
                  Led the brand extension; shop and eBay/Amazon templates for desktop and
                  mobile.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="gl-section">
          <div className="gl-wrap">
            <div className="gl-section-head">
              <div className="gl-kicker">03 · Tools &amp; skills</div>
              <h2 className="gl-section-title">How I work</h2>
            </div>
            <div className="gl-skills-row">
              <span className="gl-skill">Figma</span>
              <span className="gl-skill">Design systems</span>
              <span className="gl-skill">BITV 2 / WCAG</span>
              <span className="gl-skill">UX research &amp; prototyping</span>
              <span className="gl-skill">Workshop facilitation</span>
              <span className="gl-skill">Claude &amp; Claude Code</span>
              <span className="gl-skill">React / Vite</span>
              <span className="gl-skill">Agile collaboration</span>
            </div>
          </div>
        </section>

        <footer className="gl-footer">
          <div className="gl-wrap">
            <InteresseChat />
            <div className="gl-foot-meta">Dossier compiled for 2026 applications · versusforge.com</div>
          </div>
        </footer>
      </div>
    </>
  );
}
