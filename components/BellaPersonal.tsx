"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import BellaPostsCarousel, { type BellaPost } from "./BellaPostsCarousel";
import { personalize, type PersonVars } from "@/lib/personalize";

// Bellas Beiträge, aber mit dem Namen und dem Ort DES BESUCHERS.
//
// Er trägt beides einmal ein, es bleibt auf seinem Gerät (localStorage) — kein Konto,
// keine Anmeldung. Das Wetter holen wir zu seinem Ort dazu, damit aus
// „In {Ort} sind es {Grad}° und {Wetter}." ein echter Satz wird.

const KEY = "lb_bella_person";

type Person = { name: string; ort: string };

export default function BellaPersonal({ posts, name }: { posts: BellaPost[]; name: string }) {
  const [person, setPerson] = useState<Person | null>(null);
  const [ready, setReady] = useState(false);          // localStorage gelesen?
  const [weather, setWeather] = useState<PersonVars>({});
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [open, setOpen] = useState(false);            // Formular sichtbar?
  const [formName, setFormName] = useState("");
  const [formOrt, setFormOrt] = useState("");
  const [ortFehler, setOrtFehler] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Person;
        setPerson(p); setFormName(p.name ?? ""); setFormOrt(p.ort ?? "");
      }
    } catch { /**/ }
    setReady(true);
  }, []);

  // Wetter nachladen, sobald ein Ort bekannt ist.
  useEffect(() => {
    const ort = person?.ort?.trim();
    if (!ort) { setWeather({}); return; }
    let abgebrochen = false;
    setLoadingWeather(true);
    fetch(`/api/weather?city=${encodeURIComponent(ort)}`)
      .then(r => r.json())
      .then(d => { if (!abgebrochen && !d?.error) setWeather(d); })
      .catch(() => { /* ohne Wetter geht der Text auch */ })
      .finally(() => { if (!abgebrochen) setLoadingWeather(false); });
    return () => { abgebrochen = true; };
  }, [person?.ort]);

  const speichern = async () => {
    const ort = formOrt.trim();
    setOrtFehler("");
    if (ort) {
      // Ort direkt prüfen — sonst steht später „—" im Text und niemand weiß, warum.
      setLoadingWeather(true);
      const d = await fetch(`/api/weather?city=${encodeURIComponent(ort)}`).then(r => r.json()).catch(() => null);
      setLoadingWeather(false);
      if (d?.error) { setOrtFehler("Nu găsesc orașul ăsta — scrie-l altfel, te rog."); return; }
      setWeather(d ?? {});
    }
    const p = { name: formName.trim(), ort };
    setPerson(p); setOpen(false);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /**/ }
  };

  // Wetter zuerst, dann die Angaben des Besuchers drüber: er hat „Timisoara" getippt,
  // der Wetterdienst nennt es „Temeswar" — seine Schreibweise gewinnt.
  const vars: PersonVars = { ...weather, name: person?.name, ort: person?.ort || weather.ort };
  const persoenlich = posts.map(p => ({
    ...p,
    title: personalize(p.title, vars),
    caption: personalize(p.caption, vars),
  }));

  // Erst nach dem Lesen des Speichers rendern, sonst blitzt „Darling" kurz auf.
  if (!ready) return <BellaPostsCarousel posts={posts} name={name} />;

  const zeigeFormular = open || !person;

  // Das Formular steht nur dann ÜBER den Beiträgen, wenn es dort auch gebraucht wird:
  // also beim ersten Besuch UND wenn in den Texten Platzhalter stecken. Sonst bliebe
  // „In deiner Stadt sind es —°" stehen und die Seite sähe kaputt aus. Ohne Platzhalter
  // bleibt das Bild wie gewohnt bündig am Header.
  const hatPlatzhalter = posts.some(p => /\{\s*[a-zäöü]+\s*\}/i.test(`${p.title} ${p.caption}`));
  const formularZuerst = !person && hatPlatzhalter;

  const formular = (
    <div className="px-5 pt-5">
        {zeigeFormular ? (
          <div className="rounded-2xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.07] p-4">
            <p className="text-[15px] font-black text-white">Cum te cheamă? Din ce oraș ești?</p>
            <p className="mt-0.5 text-[12px] font-semibold text-white/55">
              Atunci {name} ți se adresează pe nume și știe ce vreme e la tine.
            </p>
            <div className="mt-3 grid gap-2">
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Numele tău"
                autoComplete="given-name"
                className="h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-[14px] font-bold text-white outline-none placeholder:font-semibold placeholder:text-white/35 focus:border-[#c9a23f]" />
              <input value={formOrt} onChange={e => setFormOrt(e.target.value)} placeholder="Orașul tău"
                autoComplete="address-level2"
                onKeyDown={e => { if (e.key === "Enter") void speichern(); }}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-[14px] font-bold text-white outline-none placeholder:font-semibold placeholder:text-white/35 focus:border-[#c9a23f]" />
            </div>
            {ortFehler && <p className="mt-2 text-[12px] font-bold text-red-300">{ortFehler}</p>}
            <button type="button" onClick={() => void speichern()} disabled={loadingWeather}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c9a23f] text-[15px] font-black text-black transition active:scale-95 disabled:opacity-50">
              {loadingWeather ? <><Loader2 className="h-4 w-4 animate-spin" /> O clipă…</> : "Gata"}
            </button>
            <p className="mt-2 text-center text-[11px] font-semibold text-white/35">
              Rămâne pe dispozitivul tău. Fără cont.
            </p>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-white/40 transition active:scale-95">
            <Pencil className="h-3 w-3" />
            {[person?.name, person?.ort].filter(Boolean).join(" · ") || "Nume și oraș"} — schimbă
          </button>
        )}
    </div>
  );

  return (
    <div>
      {formularZuerst && formular}
      <BellaPostsCarousel posts={persoenlich} name={name} />
      {!formularZuerst && formular}
    </div>
  );
}
