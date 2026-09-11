/**
 * DAS PREIS-LABEL (Owner 11.09.2026: „der Preis braucht ein schwarzes Label überall" · „oder dunkelgrau") — dunkelgrau,
 * weiße Schrift, damit es neben dem schwarzen Knopf „Vorbește cu agentul meu" nicht wie ein zweiter Knopf aussieht.
 *
 * ALS KOMPONENTE, NICHT ALS KLASSE IN `lib/`: Tailwind durchsucht nur `app/` und `components/` (tailwind.config.ts). Stand
 * die Klasse in lib/lakatosbandi-preis.ts, wurde der Hintergrund nie erzeugt — weiße Schrift auf Weiß, „man sieht den Preis
 * nicht" (Owner 11.09.2026).
 */
const GROESSE = {
  klein: "px-2 py-1 text-[13px]",
  normal: "px-2.5 py-1.5 text-[14px]",
  gross: "px-3.5 py-2 text-[17px]",
} as const;

export default function PreisLabel({ children, groesse = "normal" }: { children: React.ReactNode; groesse?: keyof typeof GROESSE }) {
  return (
    /* Eckig (Owner 11.09.2026: „nicht abrunden") — wie die Knöpfe im Portal. Grau #5c5c5c statt #3a3a3a („heller"); weiße
       Schrift bleibt gut lesbar. */
    <span className={`inline-block bg-[#5c5c5c] font-semibold leading-none text-white ${GROESSE[groesse]}`}>
      {children}
    </span>
  );
}
