/**
 * PRÜFT DAS VERSUSFORGE-POSTFACH — erst ohne Versand, dann auf Wunsch mit einer Mail.
 *
 * WARUM ZWEI STUFEN: Ein falsches Passwort merkt man sonst erst, wenn ein echter Kunde
 * seinen Trichter gebaut hat und die Mail nicht ankommt. `verify()` meldet sich am Server an
 * und legt wieder auf — es verschickt nichts und kostet nichts.
 *
 *   node scripts/versusforge-mail-probe.mjs                     → nur anmelden
 *   node scripts/versusforge-mail-probe.mjs --an du@example.com → eine echte Probemail
 *
 * DAS PASSWORT STEHT NUR IN .env.local und wird hier nie ausgegeben — auch nicht gekürzt.
 */
import fs from "node:fs";
import nodemailer from "nodemailer";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";

const user = g("VERSUSFORGE_SMTP_USER");
const pass = g("VERSUSFORGE_SMTP_PASS");
const host = g("VERSUSFORGE_SMTP_HOST") || g("SMTP_HOST");
const port = Number(g("VERSUSFORGE_SMTP_PORT") || g("SMTP_PORT") || "465");
const from = g("VERSUSFORGE_SMTP_FROM") || (user ? `VersusForge <${user}>` : "");

const fehlt = [["VERSUSFORGE_SMTP_USER", user], ["VERSUSFORGE_SMTP_PASS", pass], ["SMTP_HOST", host]]
  .filter(([, v]) => !v).map(([k]) => k);
if (fehlt.length) {
  console.error(`Fehlt in .env.local: ${fehlt.join(", ")}`);
  process.exit(1);
}

console.log(`Postfach   ${user}`);
console.log(`Server     ${host}:${port}`);
console.log(`Absender   ${from}`);

const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

try {
  await transporter.verify();
  console.log("Anmeldung  OK");
} catch (e) {
  console.error("Anmeldung  FEHLGESCHLAGEN:", e.message);
  console.error("  · Passwort im Hostinger-Postfach neu setzen und hier eintragen");
  console.error("  · bei Port 587 statt 465: VERSUSFORGE_SMTP_PORT=587");
  process.exit(1);
}

const i = process.argv.indexOf("--an");
const an = i > -1 ? process.argv[i + 1] : "";
if (!an) {
  console.log("\nNur angemeldet, nichts verschickt.");
  console.log("Echte Probemail:  node scripts/versusforge-mail-probe.mjs --an deine@adresse.de");
  process.exit(0);
}

const info = await transporter.sendMail({
  from,
  to: an,
  subject: "Probe aus dem VersusForge-Postfach",
  text: `Diese Mail kommt aus ${user}.\n\nWenn im Postfach „VersusForge" als Absender steht und NICHT „gesendet über luxurybandit.com", ist alles richtig eingerichtet.\n\nLandet sie im Spam, fehlt an der Domain noch etwas — dann sag Bescheid.`,
  html: `<p style="font-family:sans-serif;font-size:17px;line-height:1.55">Diese Mail kommt aus <b>${user}</b>.</p>`
    + `<p style="font-family:sans-serif;font-size:17px;line-height:1.55">Wenn im Postfach <b>VersusForge</b> als Absender steht und <b>nicht</b> „gesendet über luxurybandit.com", ist alles richtig eingerichtet.</p>`
    + `<p style="font-family:sans-serif;font-size:14.5px;line-height:1.55;color:#5b666f">Landet sie im Spam, fehlt an der Domain noch etwas.</p>`,
});
console.log(`\nVerschickt an ${an} — ${info.messageId}`);
console.log("Im Postfach prüfen: steht dort „VersusForge" oder „via luxurybandit.com"?");
