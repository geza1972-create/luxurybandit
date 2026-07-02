import InfoPage from "@/components/InfoPage";
import Link from "next/link";

export const metadata = { title: "About — LuxuryBandit" };

export default function AboutPage() {
  return (
    <InfoPage title="About LuxuryBandit">
      <p className="text-lg font-black text-black">Bandit the feeling!&trade;</p>
      <p>
        LuxuryBandit is here to inspire you — and to make luxury, or at least the feeling of it,
        something you can actually afford. We don&apos;t own a shop and we don&apos;t hand-pick
        every product. Instead, we built an algorithm that searches the internet for pieces that
        match the look in the video — the same vibe, across every budget. Some of the shops
        behind those finds are our partners.
      </p>
      <p>
        Because a look is sometimes just an appearance — an illusion you can recreate for a
        fraction of the price. That&apos;s exactly why we created the{" "}
        <strong>Bandit the feeling!&trade;</strong> button: tap it and we find the products that
        give you the same feeling, from the luxury original down to the affordable find. You
        decide the price.
      </p>

      <h2>How it works</h2>
      <p>
        <strong>1. Real people spot the look.</strong> Every look is created by a curator with a
        point of view — a moment worth wearing.
      </p>
      <p>
        <strong>2. Our algorithm finds the products.</strong> It scans the internet for pieces
        that match the look — across every budget, some of them from our partners — so you can
        shop the feeling at any price.
      </p>
      <p>
        <strong>3. Try it on with AI.</strong> See yourself wearing the look on your own photo,
        before you buy — and share it.
      </p>

      <h2>Become a curator</h2>
      <p>
        Anyone can become a curator: spot trends, publish looks, and earn from what you curate.{" "}
        <Link href="/curators">Start here →</Link>
      </p>

      <h2>How we make money</h2>
      <p>
        We earn an affiliate commission when you shop through a look. We don&apos;t hold
        inventory and we don&apos;t sell anything ourselves — the price you pay is set by the
        shop you buy from.
      </p>

      <h2>Contact</h2>
      <address className="not-italic text-black/70">
        <strong>LuxuryBandit</strong><br />
        Luisenstr. 51<br />
        Berlin
      </address>

      <p className="mt-6 text-xs text-black/40">
        Questions? Reach us through your <Link href="/curators">curator profile</Link> or the in-app messages.
      </p>
    </InfoPage>
  );
}
