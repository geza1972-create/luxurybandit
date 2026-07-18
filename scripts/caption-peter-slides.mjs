/**
 * Adds "booked-a-journey-with-Bella" style captions to Peter's sample slides
 * on Bella's card-studio, written from his (Peter's) point of view.
 *   node scripts/caption-peter-slides.mjs           # dry run
 *   node scripts/caption-peter-slides.mjs --apply
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");

const CAPTIONS = {
  "473c1aaf-e603-4f02-8c8e-5523e6f031f6": "We landed this afternoon and I still haven't unpacked — the second we got to the terrace, Bella just grabbed my arm and said \"look\" and pointed at Teide catching the last light. I've seen a hundred sunsets, but standing here with her, in a place I'd never even thought about visiting a month ago, it hit different. Three days suddenly feels way too short.",
  "e8342bd7-31e9-41fa-8f5c-0164feb9d5a8": "Before dinner she disappeared for twenty minutes and came back in this white dress with tiny flowers on it — didn't say a word, just took my hand and walked me down the terrace like she'd planned the whole entrance. The wind kept catching the fabric, the sea was doing that gold-and-pink thing behind her. I stopped talking mid-sentence. Worth it.",
  "3c8b8fd7-8e2a-4e78-bf45-52ed9111a624": "Sitting at home with my coffee, bag already packed by the door, and I keep rereading her message from this morning: \"can't wait to show you my island.\" Three days, just the two of us, no calls, no calendar. Half of me can't believe I actually did this. The other half is already at the airport.",
  "6ef6ba40-a80c-49ce-859a-83b850727f4d": "Second evening in a row we've ended up right back on this same corner of the terrace — didn't plan it, we just keep gravitating here. Bella says it's her favorite five minutes of the day, right when the mountain turns orange. I used to think that sounded cheesy. Now I get it.",
  "1a2dead5-5e94-49ea-aeb1-fab7994e24ef": "They set up this little table for us with candles and string lights, right on the edge overlooking the water. We talked for almost two hours over wine and didn't once check our phones. She told me about the first place she'd take me tomorrow, I told her I didn't want tomorrow to come — this dinner, right here, was already the best part of my year.",
  "d579fd9e-c436-496b-a7d3-1f18f2c42ec3": "We stopped walking without really deciding to. The ocean was doing its sunset thing behind her, the palm trees were rustling, and she just turned and looked at me like she had something to say — then didn't say it, just smiled. Some moments don't need a caption. I'm putting one anyway because I never want to forget this one.",
  "c72d4adf-8826-47ed-9b37-186dbe4e1a45": "People keep asking me how this whole trip even started — this poster is basically the answer. \"Book the journey. She lives it. You experience it.\" I saw it, thought it was a gimmick, booked it anyway. Three days later I'm the guy telling everyone to just try it. Best impulse decision I've made in years.",
  "334d814e-317f-4dba-99f6-66cbe0e1e953": "Every single evening here ends the same way and I am not complaining — us, this railing, the flowers, Teide going orange behind the water. Bella keeps saying \"wait for it\" right before the sun dips, like it's a surprise every time. It kind of is.",
  "ae20edd0-7d34-4a7f-b78a-6a824f762770": "Got back to the villa still laughing about something stupid that happened at dinner — I don't even remember what started it, just that we couldn't stop. The lights were low, she was still in that black lace look from earlier, and for a second I just stood there thinking: I need to do this more often.",
};

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const mainPath = "try-this-look/card-studio.json";
const backupPath = "try-this-look/card-studio-backup.json";

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY" : "👀 DRY RUN"}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, { headers });
  if (!res.ok) { console.error("❌ load failed", res.status); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  const data = JSON.parse(buf.toString("utf8"));
  let changed = 0;
  const slides = data.slides.map(s => {
    if (CAPTIONS[s.id]) {
      changed++;
      console.log(`  • ${s.id} → "${CAPTIONS[s.id]}"`);
      return { ...s, caption: CAPTIONS[s.id] };
    }
    return s;
  });
  console.log(`\n${changed} slide(s) will be captioned.`);
  if (!APPLY) { console.log("Dry run — nothing written. Re-run with --apply."); return; }
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(backupPath)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: buf,
  });
  const write = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ slides, savedAt: new Date().toISOString() }),
  });
  if (!write.ok) throw new Error(`Write failed: ${write.status} ${await write.text()}`);
  console.log("✅ Captions saved.");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
