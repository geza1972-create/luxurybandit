"use client";

export const dynamic = "force-dynamic";

import { Loader2, MessageCircle, Send, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type InboxMessage = {
  id: string;
  fromName: string;
  fromUsername: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [selected, setSelected] = useState<InboxMessage | null>(null);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { setAuthed(false); setLoading(false); return; }
    fetch("/api/messages", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((p: { messages: InboxMessage[] }) => setMessages(p.messages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = messages.filter(m => !m.readAt).length;

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button type="button" onClick={() => router.back()}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/40">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex-1 text-sm font-black text-black">
            Messages {unread > 0 && <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-black text-white">{unread}</span>}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-black/20" />
          </div>
        ) : !authed ? (
          /* Not signed in */
          <div className="flex flex-col items-center gap-4 py-20 text-center px-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-black/5">
              <MessageCircle className="h-7 w-7 text-black/30" />
            </div>
            <div>
              <p className="font-black text-black">Sign in to see your messages</p>
              <p className="mt-1 text-sm text-black/50">Messages from the community land here.</p>
            </div>
            <a href="/stores?panel=account"
              className="flex h-11 items-center justify-center rounded-xl bg-black px-8 text-sm font-black text-white">
              Sign in
            </a>
          </div>
        ) : selected ? (
          /* Thread view */
          <div className="grid gap-4">
            <button type="button" onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm font-bold text-black/50 hover:text-black transition">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-black grid place-items-center text-white text-sm font-black">
                {(selected.fromName || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-black">{selected.fromName}</p>
                <p className="text-[11px] text-black/40">@{selected.fromUsername} · {timeAgo(selected.createdAt)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-black/8 px-4 py-4">
              <p className="text-sm text-black/80 leading-relaxed whitespace-pre-wrap">{selected.text}</p>
            </div>
            {/* Reply via profile */}
            <a href={`/profile/${selected.fromUsername}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-black text-black active:scale-95 transition-transform">
              <Send className="h-4 w-4" /> Reply to @{selected.fromUsername}
            </a>
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-20 text-center px-8">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-black/5">
              <MessageCircle className="h-7 w-7 text-black/30" />
            </div>
            <div>
              <p className="font-black text-black">No messages yet</p>
              <p className="mt-1 text-sm text-black/50">When someone messages you, it'll show up here.</p>
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="rounded-2xl border border-black/8 bg-white overflow-hidden divide-y divide-black/5">
            {messages.map(m => (
              <button key={m.id} type="button" onClick={() => setSelected(m)}
                className={`w-full text-left px-4 py-3.5 hover:bg-black/[0.02] transition-colors ${!m.readAt ? "bg-black/[0.015]" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="relative h-10 w-10 shrink-0 rounded-full bg-black grid place-items-center text-white text-sm font-black">
                    {(m.fromName || "?")[0].toUpperCase()}
                    {!m.readAt && (
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-black border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm truncate ${!m.readAt ? "font-black text-black" : "font-bold text-black/80"}`}>
                        {m.fromName}
                      </p>
                      <p className="shrink-0 text-[10px] text-black/30">{timeAgo(m.createdAt)}</p>
                    </div>
                    <p className="text-xs text-black/40 truncate">@{m.fromUsername}</p>
                    <p className="mt-1 text-sm text-black/60 line-clamp-2 leading-snug">{m.text}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
