import fs from "fs";
import path from "path";

/**
 * DIE TRY-ON-KARTEN-VIDEOS (Owner 13.08.2026, mit Bild des Ordners: „ich habe dir einige
 * videos eingefügt für das Card. Die nimmst du") — genau das Muster von
 * `versprechenVideos()`: der Ordner public/Tryon IST die Pflege-Oberfläche, eine .mp4
 * hineinlegen genügt. Beim Einzug am 13.08. wurden die acht Dateien auf web-taugliche
 * Namen gebracht (tryon-1…8 — Leerzeichen/Umlaute/Klammern sind in URLs Bruchstellen)
 * und je Video das Poster gezogen (`tryon-N.jpg` neben `tryon-N.mp4` — die Namensregel
 * der Karten-Pflicht, Skill `card`: NIE ein Video ohne Poster).
 *
 * Server-only (fs) — nur aus Server-Seiten aufrufen, nie aus "use client"-Dateien.
 */
/** Der allgemeine Ordner-Leser — public/<Ordner> IST die Pflege-Oberfläche (Owner
    13.08.2026: „ich habe doch einen Ordner in Public angelegt"): eine .mp4 hineinlegen
    genügt, das Poster heisst gleich und endet auf .jpg. */
export function ordnerVideos(ordnerName: string): { video: string; poster: string }[] {
  try {
    const ordner = path.join(process.cwd(), "public", ordnerName);
    return fs.readdirSync(ordner)
      .filter(f => /\.mp4$/i.test(f))
      .sort()
      /* `encodeURI`: Owner-Dateien tragen Leerzeichen („Private Chat Invitation_1080p.mp4")
         — unkodiert sind sie in URLs Bruchstellen. Der Ordner bleibt seine Oberfläche,
         umbenennen muss er nichts. */
      .map(f => ({
        video: encodeURI(`/${ordnerName}/${f}`),
        poster: fs.existsSync(path.join(ordner, f.replace(/\.mp4$/i, ".jpg")))
          ? encodeURI(`/${ordnerName}/${f.replace(/\.mp4$/i, ".jpg")}`)
          : "",
      }));
  } catch { return []; }
}

export function tryonVideos(): { video: string; poster: string }[] {
  return ordnerVideos("Tryon");
}
