"use client";

/**
 * DAS ANZEIGENBILD AUF SEINER SEITE — ansehen und laden (Owner 09.09.2026).
 *
 * ERST SEHEN, DANN LADEN: Niemand postet ein Bild, das er nicht angesehen hat. Das Vorschau-
 * bild kommt per GET aus derselben Route, die auch die Datei liefert — ein Bild, zwei Wege,
 * keine zweite Wahrheit.
 *
 * `download` am Anker statt eines Skripts: Am Handy landet die Datei damit in den Downloads,
 * ohne dass jemand lange auf ein Bild drücken muss.
 */
export default function AnzeigeBild({ hook, adresse }: { hook: string; adresse: string }) {
  const quelle = `/api/versusforge-bild?m=${encodeURIComponent(adresse.split("/").pop() ?? "")}`;
  return (
    <div className="mt-3.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={quelle}
        alt={`Anzeigenbild: ${hook}`}
        /* KEINE RUNDEN ECKEN, DAFÜR SCHATTEN (Owner 09.09.2026). Ein abgerundetes Vorschau-
           bild lügt: Instagram zeigt die Kachel mit scharfen Ecken. Der Schatten hebt sie
           von der weissen Seite ab — sonst verschwimmt ein weisses Bild auf weissem Grund. */
        className="w-full max-w-[340px] shadow-[0_10px_34px_rgba(20,24,28,.18)]"
      />
      {/* WOFÜR ES IST, DIREKT UNTER DEM BILD (Owner 09.09.2026: „unter dem Bild: das kannst
          du auf Instagram oder Facebook posten"). Vorher stand über dem Bild die Masszahl —
          die interessiert ihn nicht. Was er wissen muss, ist, was er damit TUN kann. */}
      <p className="mt-3 text-[15px] leading-[1.5] text-[#5b666f]">
        Das kannst du auf Instagram oder Facebook posten.
      </p>
      {/* KEIN LADEN-KNOPF MEHR (Owner 09.09.2026: „das raus"). Das Bild steht in voller
          Grösse da — am Handy hält man darauf und speichert es, am Rechner mit der rechten
          Maustaste. Ein eigener Knopf dafür ist die dritte blaue Fläche auf einem Schirm, auf
          dem nur eine etwas verkaufen soll. */}
    </div>
  );
}
