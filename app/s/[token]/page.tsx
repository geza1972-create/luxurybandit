import Link from "next/link";
import { readSurpriseLog, writeSurpriseLog, getSignedUrl } from "@/lib/try-this-look-store";
import RevokeButton from "@/components/RevokeButton";

// Die private Ansicht eines „Surprise him"-Videos. Der Token in der URL ist der einzige
// Zugang: nicht verlinkt, nicht indexierbar, nach 7 Tagen tot. Gemeldete Links sind sofort tot.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "A private message",
  robots: { index: false, follow: false },
};

export default async function PrivateVideoPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};
  const entries = await readSurpriseLog();
  const entry = entries.find(e => e.id === token);
  const expired = entry ? Date.parse(entry.expiresAt) < Date.now() : false;
  const gone = !entry || entry.revoked || expired;

  // Öffnungen zählen (nur wenn der Link noch lebt) — die Absenderin sieht so, ob es ankam.
  if (entry && !gone && !sp.report) {
    entry.opened = (entry.opened ?? 0) + 1;
    await writeSurpriseLog(entries).catch(() => {});
  }

  const src = !gone
    ? (entry!.videoPath ? (await getSignedUrl(entry!.videoPath, 60 * 60).catch(() => "")) || entry!.videoUrl || "" : entry!.videoUrl || "")
    : "";

  return (
    <main className="lb-bg grid min-h-screen place-items-center px-4 py-10 text-white">
      <div className="w-full max-w-[420px]">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">LuxuryBandit</p>

        {gone ? (
          <>
            <h1 className="mt-2 text-[30px] font-black leading-[1.06]">This link is <span className="text-[#f6cf51]">gone</span></h1>
            <p className="mt-3 text-[16px] font-medium leading-relaxed text-white/75">
              It either expired, or it was reported and deleted. Nothing is stored for you here.
            </p>
            <Link href="/themes" className="lb-gold mt-6 flex h-11 items-center justify-center rounded-full text-[14px] font-black">
              See what LuxuryBandit is
            </Link>
          </>
        ) : sp.report ? (
          <>
            <h1 className="mt-2 text-[30px] font-black leading-[1.06]">Report and <span className="text-[#f6cf51]">delete</span></h1>
            <p className="mt-3 text-[16px] font-medium leading-relaxed text-white/75">
              You didn&apos;t want this, or it shows someone who didn&apos;t agree to it? One tap and the
              link dies — nobody can open it again.
            </p>
            <RevokeButton token={token} />
            <p className="mt-4 text-[13px] font-bold leading-snug text-white/55">
              If this is about someone else&apos;s picture, please also write to us via the{" "}
              <Link href="/contact" className="font-black text-[#f6cf51] underline underline-offset-2">contact form</Link> — we
              delete the file itself, not just the link.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-[30px] font-black leading-[1.06]">
              {entry!.fromName ? <>{entry!.fromName} sent you <span className="text-[#f6cf51]">this</span></> : <>Someone sent you <span className="text-[#f6cf51]">this</span></>}
            </h1>
            <p className="mt-3 text-[13px] font-bold leading-snug text-white/55">
              For your eyes only. The link disappears on {new Date(entry!.expiresAt).toLocaleDateString("en-GB")}.
            </p>
            {entry!.message && (
              <p className="mt-4 border-l-[3px] border-[#f6cf51] pl-3 text-[17px] font-semibold leading-snug text-white">
                {entry!.message}
              </p>
            )}
            {src ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={src} controls playsInline className="aspect-[3/4] w-full object-cover" />
              </div>
            ) : (
              <p className="mt-4 text-[15px] font-bold text-white/70">The video could not be loaded.</p>
            )}
            <p className="mt-4 text-[13px] font-bold leading-snug text-white/55">
              Please keep it to yourself — passing on someone&apos;s intimate video without their consent is a
              criminal offence in most countries.{" "}
              <Link href={`/s/${token}?report=1`} className="font-black text-[#f6cf51] underline underline-offset-2">Report / delete</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
