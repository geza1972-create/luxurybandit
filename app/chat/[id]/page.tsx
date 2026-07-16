"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModelChat from "@/components/ModelChat";
import SubscribeDialog from "@/components/SubscribeDialog";

type Profile = { firstName?: string; lastName?: string; bio?: string; style?: string; photoUrl?: string };

// Dedicated full-page chat (not an overlay). A real page has nothing behind it, so the iOS
// keyboard can never make the page underneath peek through — the whole reason for this route.
export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    try { setIsSubscribed(!!localStorage.getItem("luxurybandit-try-look-admin-pin") || localStorage.getItem("lb_subscribed") === "1"); } catch { /**/ }
    try { setIsOwn(JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id === id); } catch { /**/ }
    if (!id) return;
    fetch(`/api/curator?profile=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { if (d?.profile) setProfile(d.profile as Profile); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [id]);

  // Returned from the $3.99 Stripe pass (full-page redirect fallback, e.g. popup-blocked
  // mobile): verify the payment, activate the 30-min pass, and stay right here in the chat.
  useEffect(() => {
    let sp: URLSearchParams;
    try { sp = new URLSearchParams(window.location.search); } catch { return; }
    const paidCurator = sp.get("chatpaid");
    const cs = sp.get("cs");
    if (!paidCurator || !cs) return;
    (async () => {
      try {
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`).then(r => r.json()).catch(() => ({}));
        if (st?.paid) {
          const cid = String(st.chatPassCuratorId || paidCurator);
          try { localStorage.setItem(`lb_chatpass_${cid}`, String(Date.now() + 30 * 60 * 1000)); } catch { /**/ }
          try { window.dispatchEvent(new Event("lb-chatpass")); } catch { /**/ }
        }
      } catch { /**/ }
      try {
        const url = new URL(window.location.href);
        ["chatpaid", "cs", "chatcancelled"].forEach(k => url.searchParams.delete(k));
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      } catch { /**/ }
    })();
  }, [id]);

  const back = () => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/stores"); };

  if (notFound) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 lb-bg px-6 text-center text-white">
        <p className="text-sm font-bold text-white/50">This chat isn&apos;t available.</p>
        <button type="button" onClick={back} className="lb-gold rounded-full px-6 py-2.5 text-sm font-black">Go back</button>
      </div>
    );
  }
  if (!profile) {
    return <div className="flex h-[100dvh] items-center justify-center lb-bg text-sm font-bold text-white/40">Loading…</div>;
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Model";
  return (
    <>
      <ModelChat
        open page
        onClose={back}
        curatorId={id}
        modelName={name}
        modelFirstName={profile.firstName ?? ""}
        bio={profile.bio ?? ""}
        style={profile.style ?? ""}
        avatarUrl={profile.photoUrl ?? ""}
        isPaid={isSubscribed}
        isOwn={isOwn}
        onNeedPremium={() => setShowSubscribe(true)}
      />
      <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </>
  );
}
