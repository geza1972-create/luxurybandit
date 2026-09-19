/**
 * DEN REFRESH-TOKEN FÜR YOUTUBE HOLEN (Owner 17.09.2026).
 *
 * Läuft NUR bei dir auf dem Rechner und schreibt den Token nur in dein Terminal. Ich sehe ihn
 * nie; ich arbeite ausschliesslich mit den Namen der Umgebungsvariablen.
 *
 * SO GEHT ES:
 *   1) YT_CLIENT_ID und YT_CLIENT_SECRET aus der Google Cloud Console bereitlegen
 *      (OAuth-Client vom Typ „Desktop").
 *   2) node scratch-youtube-token.mjs
 *   3) Die angezeigte Adresse im Browser öffnen, mit dem Konto anmelden, dem der YouTube-Kanal
 *      gehört, und den Code zurück ins Terminal kopieren.
 *   4) Die drei Werte in .env.local und in Vercel eintragen.
 *
 * Der Token läuft nicht ab, solange du ihn nicht widerrufst.
 */
import { createInterface } from "node:readline/promises";
import { stdin as ein, stdout as aus } from "node:process";

const frage = createInterface({ input: ein, output: aus });

const id = process.env.YT_CLIENT_ID?.trim() || (await frage.question("YT_CLIENT_ID: ")).trim();
const geheim = process.env.YT_CLIENT_SECRET?.trim() || (await frage.question("YT_CLIENT_SECRET: ")).trim();
if (!id || !geheim) { console.error("Beides wird gebraucht."); process.exit(1); }

/* „Out of band" ist bei Google abgeschaltet — also der Umweg über eine lokale Adresse, die der
   Browser aufruft. Dieses Skript hört dafür kurz auf Port 8787. */
const umleitung = "http://localhost:8787";
const adresse = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: id,
  redirect_uri: umleitung,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/youtube.upload",
  access_type: "offline",
  prompt: "consent",
});

console.log("\n1) Diese Adresse im Browser öffnen:\n");
console.log(adresse + "\n");
console.log("2) Anmelden und freigeben. Danach kommst du hierher zurück.\n");

const { createServer } = await import("node:http");
const code = await new Promise((fertig, schief) => {
  const dienst = createServer((anfrage, antwort) => {
    const u = new URL(anfrage.url ?? "/", umleitung);
    const c = u.searchParams.get("code");
    antwort.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    antwort.end(c ? "<h2>Fertig. Du kannst dieses Fenster schliessen.</h2>" : "<h2>Kein Code angekommen.</h2>");
    dienst.close();
    c ? fertig(c) : schief(new Error("kein Code"));
  });
  dienst.listen(8787);
  setTimeout(() => { dienst.close(); schief(new Error("Zeit abgelaufen")); }, 5 * 60_000);
});

const res = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: id, client_secret: geheim, code,
    grant_type: "authorization_code", redirect_uri: umleitung,
  }),
});
const d = await res.json();
if (!d.refresh_token) { console.error("Kein Refresh-Token bekommen:", d); process.exit(1); }

console.log("\n────────────────────────────────────────────────");
console.log("In .env.local und in Vercel eintragen:\n");
console.log(`YT_CLIENT_ID=${id}`);
console.log("YT_CLIENT_SECRET=<dein Wert>");
console.log(`YT_REFRESH_TOKEN=${d.refresh_token}`);
console.log("────────────────────────────────────────────────\n");
frage.close();
