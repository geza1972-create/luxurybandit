"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { fillPrices } from "@/lib/pricing";

/**
 * WAS NACH DER ZAHLUNG PASSIERT.
 *
 * Vorher: Stripe schickte den Kunden auf die Themenseite zurück — und dort wusste niemand,
 * dass er gerade bezahlt hat. Die Seite sah aus wie vorher, der Kaufknopf stand noch da,
 * seine 5 Videos waren unsichtbar. Genau der Moment, in dem man das Vertrauen verliert.
 *
 * Jetzt: Die Rückkehr trägt `?paid=1&cs=<sitzung>`. Wir fragen Stripe (über
 * /api/checkout-status), ob wirklich bezahlt wurde — der Client behauptet das nie selbst —,
 * schreiben das Abo auf dem Gerät gut, damit die Funnels sofort freigeschaltet sind, und
 * sagen es ihm mit einem Kasten oben auf der Seite.
 */

const T: Record<string, { ok: string; okP: string; wait: string; fail: string }> = {
  en: { ok: "You're in 🎉", okP: "Your subscription is active: {videos} videos a month across all topics. Chatting stays free.", wait: "Confirming your payment …", fail: "We could not confirm the payment yet. If you were charged, it will appear in a moment." },
  de: { ok: "Du bist dabei 🎉", okP: "Dein Abo läuft: {videos} Videos im Monat über alle Themen. Chatten bleibt gratis.", wait: "Zahlung wird bestätigt …", fail: "Die Zahlung ist noch nicht bestätigt. Falls abgebucht wurde, erscheint sie gleich." },
  ro: { ok: "Ești înăuntru 🎉", okP: "Abonamentul e activ: {videos} videoclipuri pe lună în toate temele. Chatul rămâne gratuit.", wait: "Confirmăm plata …", fail: "Plata nu e confirmată încă. Dacă a fost debitată, apare imediat." },
  es: { ok: "¡Ya estás dentro! 🎉", okP: "Tu suscripción está activa: {videos} vídeos al mes en todos los temas. Chatear sigue gratis.", wait: "Confirmando el pago …", fail: "Aún no podemos confirmar el pago. Si se cobró, aparecerá enseguida." },
  fr: { ok: "C'est bon 🎉", okP: "Ton abonnement est actif : {videos} vidéos par mois sur tous les thèmes. Le chat reste gratuit.", wait: "Confirmation du paiement …", fail: "Le paiement n'est pas encore confirmé. S'il a été débité, il apparaîtra sous peu." },
  pt: { ok: "Estás dentro 🎉", okP: "A tua subscrição está ativa: {videos} vídeos por mês em todos os temas. Conversar continua grátis.", wait: "A confirmar o pagamento …", fail: "Ainda não confirmámos o pagamento. Se foi cobrado, aparece já." },
  pl: { ok: "Jesteś w grze 🎉", okP: "Subskrypcja działa: {videos} filmów miesięcznie we wszystkich tematach. Czat pozostaje darmowy.", wait: "Potwierdzamy płatność …", fail: "Płatność nie jest jeszcze potwierdzona. Jeśli została pobrana, pojawi się za chwilę." },
  it: { ok: "Ci sei 🎉", okP: "L'abbonamento è attivo: {videos} video al mese in tutti i temi. Chattare resta gratis.", wait: "Confermiamo il pagamento …", fail: "Il pagamento non è ancora confermato. Se è stato addebitato, comparirà a breve." },
};

export default function PaidReturn({ lang = "en" }: { lang?: string }) {
  const [state, setState] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const t = T[lang] ?? T.en;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") !== "1") return;
    const cs = q.get("cs") ?? "";
    setState("checking");

    // Ohne Sitzungs-ID können wir nichts prüfen — dann lieber nichts behaupten.
    if (!cs) { setState("fail"); return; }

    fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
      .then(r => r.json())
      .then(d => {
        if (!d?.paid) { setState("fail"); return; }
        // Gerät freischalten, damit die Funnels sofort offen sind (der Server hat das
        // Monatsguthaben beim selben Aufruf gutgeschrieben).
        try {
          for (const k of ["lb_chat_abo", "lb_holiday_abo"]) localStorage.setItem(k, "1");
          if (d.email) localStorage.setItem("lb_customer_email", String(d.email));
        } catch { /**/ }
        setState("ok");
      })
      .catch(() => setState("fail"));
  }, []);

  if (state === "idle") return null;

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 ${state === "ok" ? "border-[#f6cf51]/50 bg-[#f6cf51]/10" : "border-white/25 bg-white/[0.06]"}`}>
      {state === "checking" && (
        <p className="flex items-center gap-2 text-[14px] font-bold text-white/85"><Loader2 className="h-4 w-4 animate-spin" /> {t.wait}</p>
      )}
      {state === "ok" && (<>
        <p className="flex items-center gap-2 text-[16px] font-black text-[#f6cf51]"><Check className="h-4 w-4" /> {t.ok}</p>
        {/* Durch `fillPrices` — der erste Satz, den ein zahlender Kunde liest, muss die
            heutige Zahl tragen. Hier stand sie fest auf 5, in acht Sprachtabellen. */}
        <p className="mt-1 text-[13px] font-bold leading-snug text-white/85">{fillPrices(t.okP, lang)}</p>
      </>)}
      {state === "fail" && <p className="text-[13px] font-bold leading-snug text-white/85">{t.fail}</p>}
    </div>
  );
}
