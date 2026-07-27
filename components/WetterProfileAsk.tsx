"use client";

import { useState } from "react";
import { Loader2, MapPin, Check, BellOff } from "lucide-react";

/**
 * Fragt fehlende Stadt/Telefonnummer nach — und bietet direkt daneben das Abbestellen an.
 *
 * Warum beides in einer Karte: Wer automatisch in die Liste kam (weil er ein anderes Thema
 * gekauft hat), soll im selben Atemzug entscheiden können — mitmachen und Wetter „bei dir"
 * bekommen, oder raus. Alles andere wäre eine Falle.
 */

const T: Record<string, {
  head: string; sub: string; name: string; birth: string; g: Record<"m" | "f" | "x", string>;
  city: string; phone: string; save: string; done: string;
  stop: string; stopSure: string; stopped: string;
}> = {
  en: { head: "Where should the weather come from?", sub: "Tell me your city and I'll send the weather where you actually are. Your number stays private — it is only used for the region and language.", name: "Your name", birth: "Your date of birth", g: { m: "Male", f: "Female", x: "Other" }, city: "Your city", phone: "Phone with country code (+40 …)", save: "Save", done: "Saved — tomorrow it fits you.", stop: "Stop the daily mail", stopSure: "Tap again to unsubscribe", stopped: "Unsubscribed. No more daily mail." },
  de: { head: "Woher soll das Wetter kommen?", sub: "Sag mir deine Stadt, dann schicke ich dir das Wetter, wo du wirklich bist. Deine Nummer bleibt privat — sie dient nur der Region und der Sprache.", name: "Dein Name", birth: "Dein Geburtsdatum", g: { m: "Männlich", f: "Weiblich", x: "Divers" }, city: "Deine Stadt", phone: "Telefon mit Vorwahl (+49 …)", save: "Speichern", done: "Gespeichert — morgen passt es zu dir.", stop: "Tagespost abbestellen", stopSure: "Nochmal tippen zum Abmelden", stopped: "Abgemeldet. Keine Tagespost mehr." },
  ro: { head: "De unde să vină vremea?", sub: "Spune-mi orașul tău și îți trimit vremea de unde ești cu adevărat. Numărul rămâne privat — folosit doar pentru regiune și limbă.", name: "Numele tău", birth: "Data nașterii", g: { m: "Bărbat", f: "Femeie", x: "Altul" }, city: "Orașul tău", phone: "Telefon cu prefix (+40 …)", save: "Salvează", done: "Salvat — mâine se potrivește.", stop: "Nu mai vreau mesajul zilnic", stopSure: "Apasă din nou pentru dezabonare", stopped: "Dezabonat. Nu mai primești mesaje." },
  es: { head: "¿De dónde debe venir el tiempo?", sub: "Dime tu ciudad y te envío el tiempo de donde estás. Tu número queda privado — solo para la región y el idioma.", name: "Tu nombre", birth: "Tu fecha de nacimiento", g: { m: "Hombre", f: "Mujer", x: "Otro" }, city: "Tu ciudad", phone: "Teléfono con prefijo (+34 …)", save: "Guardar", done: "Guardado — mañana encaja.", stop: "Dejar de recibir el correo diario", stopSure: "Pulsa otra vez para darte de baja", stopped: "Baja completada." },
  fr: { head: "D'où doit venir la météo ?", sub: "Dis-moi ta ville et je t'envoie la météo de là où tu es. Ton numéro reste privé — uniquement pour la région et la langue.", name: "Ton prénom", birth: "Ta date de naissance", g: { m: "Homme", f: "Femme", x: "Autre" }, city: "Ta ville", phone: "Téléphone avec indicatif (+33 …)", save: "Enregistrer", done: "Enregistré — demain ça colle.", stop: "Arrêter le message quotidien", stopSure: "Touche encore pour te désabonner", stopped: "Désabonné." },
  pt: { head: "De onde deve vir o tempo?", sub: "Diz-me a tua cidade e envio-te o tempo de onde estás. O número fica privado — só para região e idioma.", name: "O teu nome", birth: "A tua data de nascimento", g: { m: "Homem", f: "Mulher", x: "Outro" }, city: "A tua cidade", phone: "Telefone com indicativo (+351 …)", save: "Guardar", done: "Guardado — amanhã encaixa.", stop: "Parar a mensagem diária", stopSure: "Toca outra vez para cancelar", stopped: "Cancelado." },
  pl: { head: "Skąd ma być pogoda?", sub: "Podaj miasto, a wyślę pogodę z miejsca, gdzie naprawdę jesteś. Numer zostaje prywatny — tylko region i język.", name: "Twoje imię", birth: "Data urodzenia", g: { m: "Mężczyzna", f: "Kobieta", x: "Inne" }, city: "Twoje miasto", phone: "Telefon z kierunkowym (+48 …)", save: "Zapisz", done: "Zapisane — jutro będzie pasować.", stop: "Nie chcę codziennej wiadomości", stopSure: "Dotknij ponownie, aby zrezygnować", stopped: "Wypisano." },
  it: { head: "Da dove deve arrivare il meteo?", sub: "Dimmi la tua città e ti mando il meteo di dove sei. Il numero resta privato — solo per regione e lingua.", name: "Il tuo nome", birth: "La tua data di nascita", g: { m: "Uomo", f: "Donna", x: "Altro" }, city: "La tua città", phone: "Telefono con prefisso (+39 …)", save: "Salva", done: "Salvato — domani va bene.", stop: "Basta messaggio quotidiano", stopSure: "Tocca di nuovo per disiscriverti", stopped: "Disiscritto." },
};

export default function WetterProfileAsk({ sub, modelId, lang = "en", askName = false, askBirthdate = false, askGender = false, askCity = false, askPhone = false }: {
  sub: string; modelId?: string; lang?: string;
  askName?: boolean; askBirthdate?: boolean; askGender?: boolean; askCity?: boolean; askPhone?: boolean;
}) {
  const t = T[lang] ?? T.en;
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [sure, setSure] = useState(false);
  const [gone, setGone] = useState(false);

  if (!sub || gone) {
    return gone ? <p className="mt-4 rounded-2xl border border-white/20 bg-white/[0.06] px-4 py-3 text-[13px] font-bold text-white/85">{t.stopped}</p> : null;
  }
  if (done) return <p className="mt-4 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-4 py-3 text-[13px] font-bold text-[#f6cf51]">{done}</p>;

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch("/api/wetter-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub, modelId, ...payload }),
      });
      const d = await r.json().catch(() => ({}));
      setBusy(false);
      return r.ok && d?.ok;
    } catch { setBusy(false); return false; }
  };

  const anything = [name, birthdate, gender, city, phone].some(v => v.trim());
  const save = async () => {
    if (!anything) return;
    if (await post({ name: name.trim(), birthdate: birthdate.trim(), gender, city: city.trim(), phone: phone.trim() })) setDone(t.done);
  };

  const stop = async () => {
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 3000); return; }
    if (await post({ unsubscribe: true })) setGone(true);
  };

  const input = "mt-2 h-11 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/60 focus:border-[#f6cf51]";

  return (
    <div className="mt-4 rounded-2xl border border-white/20 bg-white/[0.06] p-4">
      <p className="flex items-center gap-2 text-[15px] font-black text-white">
        <MapPin className="h-4 w-4 text-[#f6cf51]" /> {t.head}
      </p>
      <p className="mt-1 text-[13px] font-bold leading-snug text-white/75">{t.sub}</p>
      {askName && <input value={name} onChange={e => setName(e.target.value)} placeholder={t.name} className={input} />}
      {askBirthdate && (
        <label className="mt-2 block">
          <span className="text-[12px] font-bold text-white/70">{t.birth}</span>
          <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date" max={new Date().toISOString().slice(0, 10)}
            className={input.replace("mt-2 ", "")} />
        </label>
      )}
      {askGender && (
        <div className="mt-2 flex gap-2">
          {(["m", "f", "x"] as const).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`h-10 flex-1 rounded-xl border text-[13px] font-black transition ${gender === g ? "border-[#f6cf51] bg-[#f6cf51] text-black" : "border-white/30 bg-white/[0.08] text-white/85"}`}>
              {t.g[g]}
            </button>
          ))}
        </div>
      )}
      {askCity && <input value={city} onChange={e => setCity(e.target.value)} placeholder={t.city} className={input} />}
      {askPhone && <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder={t.phone} className={input} />}
      <button type="button" onClick={() => void save()} disabled={busy || !anything}
        className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.save}
      </button>
      <button type="button" onClick={() => void stop()} disabled={busy}
        className={`mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black transition ${sure ? "bg-red-600 text-white" : "text-white/70 underline"}`}>
        <BellOff className="h-4 w-4" /> {sure ? t.stopSure : t.stop}
      </button>
    </div>
  );
}
