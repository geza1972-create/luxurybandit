import InfoPage from "@/components/InfoPage";
import Link from "next/link";

export const metadata = { title: "About — LuxuryBandit" };

export default function AboutPage() {
  return (
    <InfoPage title="About LuxuryBandit">
      <p className="text-lg font-black text-black">Bandit the feeling!</p>
      <p>
        LuxuryBandit is a curated trend marketplace. Real people — our curators — spot the
        looks worth wearing and pick the actual products behind them, across every budget.
        One look, shoppable from the luxury original down to the affordable find. You decide
        the price.
      </p>

      <h2>How it works</h2>
      <p>
        <strong>1. Curators spot the trend.</strong> Each look is hand-picked by a curator with
        a point of view — not an algorithm.
      </p>
      <p>
        <strong>2. Shop it at any price.</strong> Every look comes with shop options across
        budgets, so you choose what fits you.
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

      <p className="mt-6 text-xs text-black/40">
        Questions? Reach us through your <Link href="/curators">curator profile</Link> or the in-app messages.
      </p>
    </InfoPage>
  );
}
