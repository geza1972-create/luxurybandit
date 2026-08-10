import InfoPage from "@/components/InfoPage";
import { InfoAbsatz, InfoText } from "@/components/InfoText";
import { fillPrices } from "@/lib/pricing";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";
/* Das Original der Portal-Beschreibung liegt in „Über uns" (Owner 10.08.2026). */
import { aboutText } from "@/lib/about-i18n";

export const metadata = { title: "Terms of Service — LuxuryBandit" };

/**
 * DIE AGB — seit 10.08.2026 in SIEBEN SPRACHEN (Owner: „terms müsen wir auch in allen
 * sprachen machen").
 *
 * WARUM ÜBER `trObject` UND NICHT ÜBER EINE HANDGEPFLEGTE TABELLE: Für die About-Seite gibt
 * es `lib/about-i18n.ts` mit sieben Fassungen — dreissig kurze Werbezeilen, die sich selten
 * ändern. Die AGB sind das Zehnfache an Text und ändern sich JEDE Woche: Heute kam die
 * Geld-zurück-Garantie dazu, gestern die Adress-Regel. Sieben Rechtstexte von Hand
 * nachzuziehen heisst, dass ab dem ersten vergessenen Satz in fünf Sprachen etwas anderes
 * steht als in zweien — und bei AGB ist genau das der Schaden. Also: englische Quelle im
 * Code, Übersetzung zur Laufzeit mit Dauer-Cache (dieselbe Hausregel wie auf den
 * Themenseiten, siehe `lib/tr-object.ts`). Wer einen Satz ändert, ändert ihn EINMAL.
 *
 * DAS ENGLISCHE IST DIE VERBINDLICHE FASSUNG. Das ist keine Ausrede, sondern die übliche und
 * ehrliche Lösung bei maschineller Übersetzung — und es steht als eigener Satz am Ende der
 * Seite, nicht im Kleingedruckten.
 *
 * DIE AUSZEICHNUNG ÜBERLEBT DIE MASCHINE: `**fett**` und `[Wort](/adresse)` sind
 * Zeichensetzung, keine JSX-Schnipsel — siehe `components/InfoText`. Ein Absatz aus einem
 * Dutzend `<strong>`-Stücken wäre nicht übersetzbar, ohne ihn zu zerlegen.
 *
 * KEINE E-MAIL-ADRESSE IM TEXT (Owner 10.08.2026, Skill `ci-design`): Der Weg zu uns ist
 * `/contact`, nie `mailto:` — eine Adresse auf einer offenen Seite wird abgelesen, und danach
 * erstickt die Mailbox, über die jede Lieferung läuft.
 */

/* Die Sprache steht im Cookie — die Seite muss also je Aufruf gebaut werden (wie /about). */
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const L = await resolveLang();
  const A = aboutText(L);

  /**
   * Preise werden VOR der Übersetzung eingesetzt (`fillPrices`) — dieselbe Reihenfolge wie
   * auf den Themenseiten. Zahlen überstehen die Maschine unverändert; ein `{price}` in
   * geschweiften Klammern täte es vielleicht nicht, und ein falscher Preis in den AGB ist
   * ein anderer Kaliber Fehler als ein holpriger Satz.
   */
  const t = await trObject({
    titel: "Terms of Service",
    intro: "Welcome to LuxuryBandit. By creating an account or using the app you agree to these Terms. LuxuryBandit is intended for adults only — **you must be at least 18 years old** to use it.",

    h1: "1. What LuxuryBandit is",

    h2: "2. Accounts",
    p2: "You are responsible for your account and for keeping your login secure. Provide accurate information and don't impersonate anyone. We may suspend or remove accounts that break these Terms.",

    h3: "3. Subscriptions & payments",
    p3a: fillPrices("Browsing, **following** and **chatting** are free. The paid product is a monthly **topic subscription**: {price} per month (list price {list}, reduced by 50% for as long as you stay). It includes {videos} generated videos or looks per month across ALL topics together; every further one costs {extra}. Payments are handled by **Stripe**. The subscription **renews automatically** each month until you cancel; you can **cancel anytime** from your account, and cancellation takes effect at the end of the current billing period.", "en"),
    /* Die Guthaben-Zusage (Owner 01.08.2026: Aufladung verfaellt NIE — die rechtlich
       sicherste Form; genau dieser Satz macht sie verbindlich). */
    p3b: fillPrices("You can also buy single videos, or **top up an account balance** ({topup}) and pay per video from it ({once} each). Account balance **never expires**, is tied to your e-mail address, and is **not redeemable for cash**.", "en"),

    h4: "4. AI-generated content & AI chat",
    p4a: "Some influencers are AI-generated characters and some content and images are created by artificial intelligence, provided for your personal, non-commercial entertainment. Chat may be with an **AI persona** — an automated assistant styled after an influencer — rather than a live conversation with a real person. AI results may contain inaccuracies and should not be relied on as real photos or advice.",
    p4b: "The AI persona will never claim to have feelings for you or to be in a relationship with you, and it will never send sexually explicit content. You must confirm that you are 18 or older before using the chat. For details on how we use AI and where we tell you about it, see our [AI Notice](/ai-notice).",

    h4a: "What a generated result is — and is not",
    p4c: "Every image and video is produced by an AI model at the moment you request it. Results are **approximations, never exact reproductions**. Faces, hair, body proportions, clothing details, text and backgrounds may differ from the photos you upload or from the look you selected, and the same request run twice will produce **different results**. We do not promise any particular likeness, resemblance, style, quality or outcome, and a result cannot be reproduced identically on request.",

    /* Owner 05.08.2026: „manchmal haben sie blöde Bilder hochgeladen und dann ist er schuld,
       nicht wir" — „das muss im AGB auch schreiben". KEIN FOTO-TOR (Owner, direkt danach:
       „nein, sie werden nicht abgewiesen"): Eine Pruefung zu behaupten, die nicht
       stattfindet, waere eine Zusage, an der man uns misst. */
    h4b: "Your photo decides the result",
    p4d: "The result is built from the photo **you** upload, and it can only be as good as that photo. A blurry or dark picture, a face that is small, turned away, covered by sunglasses or a hand, several people in one photo, a screenshot of a screen, or a drawing instead of a photograph will produce a poor result. That is a limit of the source material, not a fault in the service, and it is **not a ground for a refund**. For the best chance of a good result, use a **sharp, well-lit photo in which one face is clearly visible**.",

    h4c: "Refunds for generated content",
    p4e: "A generation is digital content produced **individually for you, on demand**. By starting a generation you expressly request that we begin immediately and you acknowledge that, once it has begun, you **lose your right of withdrawal** for that item (Art. 16(m) Consumer Rights Directive 2011/83/EU). A delivered result is therefore **not refundable** — in particular not because it does not look the way you imagined, since that follows from the nature of AI generation described above.",
    p4f: "This does not take away rights you have by law. If a generation **fails technically** and no result is delivered to you, or if you were charged twice for the same item, [contact us](/contact?reason=support) and we will re-run it or refund that item. Subscription fees for a month already started are not refunded; cancel before the next renewal to avoid the following charge.",
    /* Owner 05.08.2026: „die können eventuell Rückerstattung anfordern, aber ich muss es
       freigeben." Genau das tut `app/api/kiss-erstattung`: Der Kunde fragt an, gebucht wird
       erst nach der Freigabe des Betreibers. */
    p4g: "Beyond those cases you may **ask** us for a refund from the finished result in the app. Each request is looked at **individually by a person** and granted at our discretion; there is no automatic entitlement. If we grant it, the amount comes back as **account balance** so your next attempt costs you nothing extra — it is not paid out in cash.",

    /**
     * DER ABSCHNITT, AUF DEN DAS ZAHLUNGSFENSTER ZEIGT (Owner 10.08.2026: „du machst jetzt
     * einen ling zu ageb drauf und beschreisbt in AGB was das ist"). Die Kennung
     * `geld-zurueck-garantie` unten am `<h3>` ist das Sprungziel (`Zahlungssiegel
     * garantieHref`) — wer sie umbenennt, lässt das Wort im Kaufmoment ins Leere zeigen.
     *
     * WORTLAUT NACH DER ANSAGE DES OWNERS: (1) nicht geliefert aus unserer Schuld → Geld
     * zurück oder aufs Konto, (2) keine Erstattung bei eigener Schuld (schlechte Fotos oder
     * Aufnahmen, mehrere erzeugte Videos), (3) wir prüfen alles, grosse Abweichung → Geld
     * zurück. WAS BEWUSST NICHT DASTEHT: „nicht zufrieden" — zweimal zurückgewiesen,
     * Begründung des Owners: „Leute sind immer nicht zufrieden."
     */
    h4d: "Money-back guarantee",
    p4h: "**What it covers.** If a video or image you paid for is **not delivered because of a fault on our side** — the generation fails, the chain breaks, nothing reaches you — you get your money back. The same applies if you were charged twice for the same item. We also **check every result**: if a delivered result shows a **major deviation** — it is not the person from your photo, it is not the occasion you paid for, or it is unusable as a whole — you get your money back as well.",
    p4i: "**How you get it back.** The amount is returned as **account balance**, so your next attempt costs you nothing extra. Balance never expires and is tied to your e-mail address; it is not paid out in cash. Ask for it from the finished result in the app, or through our [contact form](/contact?reason=support).",
    p4j: "**What it does not cover.** The guarantee is not a satisfaction guarantee. It does **not** apply where the result follows from the material **you** supplied — a blurry, dark or tiny face, a covered face, several people in one photo, a screenshot instead of a photo, or a recording in poor quality. It also does not apply when you have **generated several videos** with the same source material and ask for the money back afterwards, nor to a result that is technically correct but simply not to your taste. Which case applies is decided by us after looking at the result and the material you uploaded.",

    h5: "5. Models & earnings",
    p5: "Influencers on LuxuryBandit may be real people or AI-generated characters. Real models **apply for free**, are reviewed before they go live, must be **18+**, must use their **own genuine photos**, upload their own content, and follow our model rules. Real models **earn a 50% share** of the subscription revenue from their subscribers. We may reject or remove any model at our discretion.",

    h6: "6. Your content",
    p6: "If you upload photos or videos — for example as a model building your profile — you are responsible for them and confirm you have the right to use them, that everyone shown is **18 or older** and consents, and that they don't infringe anyone's rights. You grant us the limited permission needed to host and display your content on your profile. Don't upload other people's content without consent or anything illegal.",

    /* Owner 30.07.2026: „dann muss man das aber erwaehnen in agb". Die 90 Tage sind keine
       Floskel: der taegliche Cron loescht danach wirklich (siehe /api/kiss-deliver). */
    h6a: "6a. Photos you upload for a try-on, kiss or video",
    p6a: "To make your picture or video we **store the photos you upload** — your own photo and, if you upload one, the photo of the person you picked — together with the result, on our hosting provider's servers **in the EU**. We need them to create your result, to show it in your gallery, and to look into misuse. They are **never published** and never shown to other users; only our team can view them. We delete photos and results from visits **without a purchase after 90 days**; what you paid for stays until you delete it. You can ask us to delete everything at any time (see [Data deletion](/data-deletion)).",
    p6b: "When you enter your email address you agree that we may send you **news and offers** by email — new topics, new models and price offers. You can withdraw at any time; every email carries a one-click unsubscribe link, and it does not affect anything you already bought.",

    h7: "7. Acceptable use",
    p7: "Don't misuse the service: no illegal, abusive, harassing, or infringing activity; no attempts to break, overload, or reverse-engineer the app; and no using AI outputs to deceive or harm others.",

    h8: "8. Your data",
    p8: "We take your privacy seriously. We do **not sell your personal data**, and we do **not pass it on to third parties** for their own purposes. We only use the data we actually need to run LuxuryBandit — such as your account details and, for models, the content you upload to your profile — and we keep it **only as long as it is needed**. When your data is no longer needed, we delete it, and you can ask us to delete your account and data at any time.",

    h9: "9. Cookies",
    p9: "We use cookies to make the site work (for example, to keep you signed in) and to understand, in aggregate, how LuxuryBandit is used so we can improve it. We do not use cookies to sell your data. You can view, block, or delete cookies at any time in your browser settings — though some features may not work without the essential ones.",

    h10: "10. Disclaimers & liability",
    p10: "LuxuryBandit is provided “as is” for entertainment. To the extent permitted by law, we are not liable for indirect or incidental damages, and our total liability is limited to the amount you paid us in the 12 months before the claim.",

    h11: "11. Changes & governing law",
    p11: "We may update these Terms; we'll post the new version here with an updated date, and continued use means you accept the changes. These Terms are governed by the laws of Romania.",

    /**
     * DER SATZ ZUR ÜBERSETZUNG — er gehört zu einer maschinell übersetzten Rechtsseite dazu
     * und steht deshalb SICHTBAR über dem Datum, nicht im Kleingedruckten.
     */
    h12: "12. Language & contact",
    p12: "These Terms are written in English; the other languages are translations for your convenience. **In case of any difference, the English version applies.** Questions? Reach us through our [contact form](/contact).",

    datum: "Last updated: 10 August 2026",
  }, L);

  return (
    <InfoPage title={t.titel}>
      <InfoAbsatz>{t.intro}</InfoAbsatz>

      {/**
        * WAS DAS PORTAL IST, STEHT AN EINER STELLE (Owner 10.08.2026: „Luxury bandit nu este
        * un Marketplace de influenceri" · „Wir legen das origial in Abou an. Was dort
        * geändert wird, gilt für das ganze portal").
        *
        * HIER STAND DER FALSCHE SATZ, und zwar lange: „LuxuryBandit is an entertainment and
        * fashion app — a marketplace of influencers." Das war der alte Marktplatz; das
        * Portal verschenkt seit Monaten Geschenke. Der Fehler war nicht der Satz, sondern
        * dass es drei Beschreibungen gab — hier, auf der Startseite und in „Über uns". Zwei
        * davon pflegt niemand nach.
        *
        * Diese kommt aus `aboutText(L)` und geht deshalb NICHT durch die Übersetzungs-
        * maschine: Sie liegt dort von Hand in sieben Sprachen — geschrieben, nicht geraten.
        */}
      <h2>{t.h1}</h2>
      <InfoAbsatz>{A.portalLang}</InfoAbsatz>

      <h2>{t.h2}</h2>
      <InfoAbsatz>{t.p2}</InfoAbsatz>

      <h2>{t.h3}</h2>
      <InfoAbsatz>{t.p3a}</InfoAbsatz>
      <InfoAbsatz>{t.p3b}</InfoAbsatz>

      <h2>{t.h4}</h2>
      <InfoAbsatz>{t.p4a}</InfoAbsatz>
      <InfoAbsatz>{t.p4b}</InfoAbsatz>

      <h3>{t.h4a}</h3>
      <InfoAbsatz>{t.p4c}</InfoAbsatz>

      <h3>{t.h4b}</h3>
      <InfoAbsatz>{t.p4d}</InfoAbsatz>

      <h3>{t.h4c}</h3>
      <InfoAbsatz>{t.p4e}</InfoAbsatz>
      <InfoAbsatz>{t.p4f}</InfoAbsatz>
      <InfoAbsatz>{t.p4g}</InfoAbsatz>

      {/* Die Kennung bleibt in JEDER Sprache dieselbe — der Link im Zahlungsfenster zeigt
          auf sie, und der Kunde springt in seiner Sprache an dieselbe Stelle. */}
      <h3 id="geld-zurueck-garantie">{t.h4d}</h3>
      <InfoAbsatz>{t.p4h}</InfoAbsatz>
      <InfoAbsatz>{t.p4i}</InfoAbsatz>
      <InfoAbsatz>{t.p4j}</InfoAbsatz>

      <h2>{t.h5}</h2>
      <InfoAbsatz>{t.p5}</InfoAbsatz>

      <h2>{t.h6}</h2>
      <InfoAbsatz>{t.p6}</InfoAbsatz>

      <h2>{t.h6a}</h2>
      <InfoAbsatz>{t.p6a}</InfoAbsatz>
      <InfoAbsatz>{t.p6b}</InfoAbsatz>

      <h2>{t.h7}</h2>
      <InfoAbsatz>{t.p7}</InfoAbsatz>

      <h2>{t.h8}</h2>
      <InfoAbsatz>{t.p8}</InfoAbsatz>

      <h2>{t.h9}</h2>
      <InfoAbsatz>{t.p9}</InfoAbsatz>

      <h2>{t.h10}</h2>
      <InfoAbsatz>{t.p10}</InfoAbsatz>

      <h2>{t.h11}</h2>
      <InfoAbsatz>{t.p11}</InfoAbsatz>

      <h2>{t.h12}</h2>
      <p><InfoText>{t.p12}</InfoText></p>

      <p className="mt-6 text-xs text-black/40">{t.datum}</p>
    </InfoPage>
  );
}
