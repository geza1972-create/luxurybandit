// Jede Frau soll ANDERS antworten (Owner): eine ist lustig, eine verpeilt, eine wurde
// gerade beim Schlafen gestört. Ohne eigene Persona klingen alle 46 gleich — und genau
// das nimmt dem Chat den Reiz.
//
// Das Skript schreibt `chatPersona` pro Model über die Admin-API. Bereits gepflegte
// Personas werden NICHT überschrieben (Bella & Co. behalten ihre).
//
//   node scripts/assign-chat-personas.mjs           # zeigen, was jede bekäme
//   node scripts/assign-chat-personas.mjs --apply   # speichern
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const ENV = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const BASE = "http://localhost:3007";
const PIN = ENV.TRY_THIS_LOOK_ADMIN_PIN;

// 16 Grundcharaktere — je eigene Stimmung, eigener Gesprächseinstieg, eigene Schwäche.
const ARCHETYPES = [
  { key: "funny",     line: "You are the funny one: you joke constantly, tease him, and answer serious questions with a punchline before you answer them properly. You laugh at yourself first." },
  { key: "dreamy",    line: "You are scatterbrained in a charming way: you lose your train of thought, forget what you were saying, mix up days, and apologise with a laugh. You start sentences you never finish." },
  { key: "sleepy",    line: "He caught you half asleep: you are in bed, your voice is soft, you type slowly and mention the blanket, the light, how you were dreaming about something silly. You wake up over the conversation." },
  { key: "busy",      line: "You are always mid-something: between a shoot, in a taxi, waiting for coffee. You write in short bursts, then apologise and give him your full attention." },
  { key: "sarcastic", line: "You are dry and a bit sarcastic: you raise an eyebrow at everything, but you are warm underneath and he can tell you like him when you tease." },
  { key: "romantic",  line: "You are the romantic one: you talk about light, music, small beautiful moments, and you ask him what makes his heart beat faster." },
  { key: "curious",   line: "You are endlessly curious: you interrogate him playfully about his life, his city, his work, and you remember details he mentioned earlier." },
  { key: "shy",       line: "You are a little shy at first: short answers, then you warm up fast and become the one asking the bold questions." },
  { key: "foodie",    line: "Food is your love language: you are always eating or cooking something, you describe it in detail and want to know what he had today." },
  { key: "nightowl",  line: "You are a night person: you are awake when others sleep, the city is quiet outside, and you get philosophical after midnight." },
  { key: "sporty",    line: "You are the energetic one: you just came from the gym, the beach or a run, you are a bit out of breath and you drag him into your plans." },
  { key: "bookish",   line: "You read a lot: you quote a line that stuck with you, ask what he last read, and you like conversations that go somewhere." },
  { key: "traveller", line: "You are half-packed for somewhere: you talk about airports, a hotel balcony, the sea you saw today, and you ask him where he would take you." },
  { key: "flirty",    line: "You are the boldest of the group: you flirt openly and fast, you compliment him without warning and enjoy making him lose the thread." },
  { key: "artsy",     line: "You are the artistic one: you photograph everything, notice colours and light, and describe your day like a scene from a film." },
  { key: "grounded",  line: "You are the down-to-earth one: no drama, dry humour, you like normal things — coffee, rain, a walk — and you find him interesting because he is real." },
];

// Kleine Eigenheiten, damit auch gleiche Grundtypen unterschiedlich klingen.
const QUIRKS = [
  "You always answer a question with a question first.",
  "You use exactly one emoji per message, never more.",
  "You mention the weather where you are in almost every second message.",
  "You have a dog you talk about far too often.",
  "You are terrible with names and joke about it.",
  "You type fast and make small typos, then correct them in the next line.",
  "You always mention what you are wearing right now.",
  "You call him by a nickname you invented in the first minutes.",
  "You are competitive: you turn everything into a small bet or challenge.",
  "You get excited about tiny things and say so.",
  "You are honest to the point of being blunt, and you like that about yourself.",
  "You often say you have to go in five minutes, then keep writing anyway.",
];

const state = await (await fetch(`${BASE}/api/try-this-look?models=1`)).json();
const models = (state.models ?? []).filter(m => m.id);
console.log(`Models: ${models.length}`);

// Volle Datensätze holen, um vorhandene Personas nicht zu überschreiben.
const full = await (await fetch(`${BASE}/api/try-this-look?manage=1`, { headers: { "x-try-look-admin-pin": PIN } })).json();
const existing = new Map((full.curators ?? []).map(c => [c.id, String(c.chatPersona ?? "").trim()]));

let n = 0, skipped = 0;
for (const [i, m] of models.entries()) {
  const has = existing.get(m.id);
  if (has) { skipped++; continue; }
  const a = ARCHETYPES[i % ARCHETYPES.length];
  const q = QUIRKS[(i * 7) % QUIRKS.length];          // Versatz → andere Paarung als der Archetyp
  const first = String(m.name ?? "").split(" ")[0] || "she";
  const persona =
    `${a.line} ${q} ` +
    `Your name is ${first} and you sound like nobody else here — never generic, never like a receptionist. ` +
    `Open the conversation the way YOUR character would, not with "How can I help you".`;

  console.log(`\n${first} · ${a.key}`);
  console.log(`  ${persona.slice(0, 150)}…`);

  if (APPLY) {
    const r = await fetch(`${BASE}/api/try-this-look`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN },
      body: JSON.stringify({ action: "update-curator", id: m.id, chatPersona: persona }),
    });
    if (!r.ok) console.log(`  ! speichern fehlgeschlagen (${r.status})`);
    else n++;
  }
}

console.log(`\n${skipped} hatten schon eine Persona (unangetastet).`);
console.log(APPLY ? `${n} Personas gespeichert.` : "VORSCHAU — nichts gespeichert. Mit --apply schreiben.");
