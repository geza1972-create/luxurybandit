import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";

export const metadata = { title: "Model rules — LuxuryBandit" };

// The rules a real model must meet to be verified & approved (and why she'd be rejected).
export default function ModelRulesPage() {
  const rules: { t: string; d: string }[] = [
    { t: "You must be a real person, 18 or older", d: "Verified with a selfie holding a paper that shows “LuxuryBandit” + today’s date, plus a reply from your WhatsApp number." },
    { t: "The photos must be really you", d: "Your face photo and full-body photo have to match your verification selfie. Stolen or fake photos are rejected." },
    { t: "Clear, dressed, good-quality photos", d: "A clean face/portrait and a head-to-toe dressed photo — that’s what the AI styles." },
    { t: "You respond to fans", d: "Paid chat only earns when you actually reply. If you never respond, messages are refunded to the fan." },
    { t: "Be respectful — no illegal or hateful content", d: "No harassment, no content involving minors, nothing illegal. This is grounds for immediate removal." },
    { t: "No off-platform contact sharing", d: "Keep chats on LuxuryBandit. Don’t hand out phone numbers or move fans to other apps." },
  ];
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[440px] bg-white px-5 pb-24 pt-4 text-black shadow-[0_0_60px_rgba(0,0,0,0.15)]">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/stores" className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><ArrowLeft className="h-4 w-4" /></Link>
        <p className="text-lg font-black">Model rules</p>
      </div>
      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] font-bold text-amber-800">
        <BadgeCheck className="h-5 w-5 shrink-0 text-amber-600" />
        Meet these to get the <b className="mx-1">✓ Real model</b> badge, earnings & paid chat.
      </div>
      <ol className="space-y-4">
        {rules.map((r, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black text-[12px] font-black text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-black">{r.t}</p>
              <p className="mt-0.5 text-[13px] font-medium leading-relaxed text-black/55">{r.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[12px] font-bold text-black/40">If an application doesn’t meet these, it’s rejected. You can re-apply once it does.</p>
    </main>
  );
}
