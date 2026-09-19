/* Neue Werke brauchen QR-Code, Querformat-Merker und ein Stück mit Musik — sonst fehlt genau
   das, was das Poster verspricht. */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { werkKacheln } from "@/lib/lakatosbandi";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { motivPfad } from "@/lib/versusforge-moderation";
import { filmSeite } from "@/lib/lakatosbandi-film";

const dir = mkdtempSync(join(tmpdir(), "neu-"));
const kennung = process.env.M ?? "klimt";
const m = await mandantLesen(kennung);
const werkInfo = { ...m.werkInfo };
for (const k of werkKacheln(m)) {
  const nr = k.i < 0 ? "standard" : String(k.i);
  /* QR-Code je Werk */
  execFileSync("python3", ["-c", `
import segno, sys
segno.make(sys.argv[1], error='m').save(sys.argv[2], scale=10, border=1, dark='1a1814', light='f4efe2')
`, filmSeite(kennung, k.i), `public/lakatosbandi/qr/${kennung}-${nr}.png`]);
  /* Querformat messen */
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr))}`);
  if (!r.ok) continue;
  const p = join(dir, `${kennung}-${nr}.jpg`);
  writeFileSync(p, Buffer.from(await r.arrayBuffer()));
  try {
    const [b, h] = execFileSync("ffprobe", ["-v","error","-select_streams","v","-show_entries","stream=width,height","-of","csv=p=0:s=x", p]).toString().trim().split("x").map(Number);
    werkInfo[nr] = { ...werkInfo[nr], ...(b > h ? { quer: true } : {}) };
  } catch { /* dann hochkant */ }
}
console.log(kennung, "QR + Format:", await mandantSpeichern(kennung, { ...m, werkInfo }));
