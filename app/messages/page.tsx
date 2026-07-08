"use client";

export const dynamic = "force-dynamic";

import { Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Each stored chat lives in localStorage under lb_modelchat_<curatorId>.
type Convo = { curatorId: string; name: string; photoUrl: string; last: string; count: number };

function stripTags(s: string) {
  return s.replace(/\[\[SHOW_LINGERIE\]\]/g, "").replace(/\*[^*]+\*/g, "").trim();
}

export default function MessagesPage() {
  const router = useRouter();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gather every model chat this device has (key: lb_modelchat_<curatorId>).
    const raw: { curatorId: string; last: string; count: number }[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || "";
        if (!key.startsWith("lb_modelchat_")) continue;
        const curatorId = key.slice("lb_modelchat_".length);
        try {
          const saved = JSON.parse(localStorage.getItem(key) || "{}") as { messages?: { role: string; content: string }[] };
          const msgs = Array.isArray(saved.messages) ? saved.messages : [];
          if (!msgs.length) continue;
          raw.push({ curatorId, last: stripTags(msgs[msgs.length - 1]?.content || ""), count: msgs.length });
        } catch { /**/ }
      }
    } catch { /**/ }

    if (!raw.length) { setLoading(false); return; }
    // Fetch model names/photos to label each conversation.
    fetch("/api/try-this-look?models=1").then(r => r.json()).then(d => {
      const byId = new Map<string, { name: string; photoUrl: string }>(
        (Array.isArray(d.models) ? d.models : []).map((m: { id: string; name?: string; photoUrl?: string }) => [m.id, { name: m.name || "Model", photoUrl: m.photoUrl || "" }])
      );
      setConvos(raw.map(r => ({ ...r, name: byId.get(r.curatorId)?.name || "Model", photoUrl: byId.get(r.curatorId)?.photoUrl || "" })));
    }).catch(() => {
      setConvos(raw.map(r => ({ ...r, name: "Model", photoUrl: "" })));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#0d0b0a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0b0a]/95 px-4 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-[440px] items-center gap-3">
          <button type="button" onClick={() => router.push("/home")}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70"><ArrowLeft className="h-4 w-4" /></button>
          <span className="flex-1 text-sm font-black">Messages</span>
        </div>
      </header>

      <main className="mx-auto max-w-[440px] px-4 py-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/25" /></div>
        ) : convos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-8 py-24 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/5"><MessageCircle className="h-7 w-7 text-white/30" /></div>
            <div>
              <p className="font-black">No chats yet</p>
              <p className="mt-1 text-sm text-white/45">Start a chat with a model and it&apos;ll show up here.</p>
            </div>
            <button type="button" onClick={() => router.push("/home")}
              className="lb-gold flex h-11 items-center justify-center rounded-full px-8 text-sm font-black active:scale-95 transition">Explore models</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/[0.06]">
            {convos.map(c => (
              <button key={c.curatorId} type="button" onClick={() => router.push(`/curator/${c.curatorId}?chat=1`)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04] transition">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                  {c.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.photoUrl} alt={c.name} className="h-full w-full object-cover" />
                    : <span className="grid h-full w-full place-items-center text-sm font-black text-white/60">{c.name.slice(0, 1)}</span>}
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0b0a] bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{c.name}</p>
                  <p className="truncate text-[13px] font-medium text-white/45">{c.last || "Tap to chat"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
