import { ImageResponse } from "next/og";
import crypto from "crypto";
import { readTryThisLookState, getSignedUrl, getPricingConfig } from "@/lib/try-this-look-store";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supabase serves photos as webp, which Satori (next/og) can't decode. Route each image through
// the Next optimizer with an Accept:jpeg header to transcode → base64 JPEG that Satori renders.
async function toJpeg(origin: string, url: string, w = 828): Promise<string> {
  if (!url) return "";
  try {
    const r = await fetch(`${origin}/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=70`, { headers: { Accept: "image/jpeg" } });
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch { return ""; }
}

// GET /api/model-card-image?id=<curatorId> → a shareable PNG that mirrors her full Model Card:
// photo + badges, name + motto, her clip thumbnails, profile data, stats and CTAs. Used by the
// card's Share button so a shared image looks exactly like the card.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  try {
    const state = await readTryThisLookState();
    const c = (state.curators ?? []).find(x => x.id === id) as any;
    if (!c) return new Response("Not found", { status: 404 });
    const realName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Model";
    const name = String(c.modelName || "").trim() || realName; // display name (elegant single name)
    const nmKey = realName.toLowerCase(); // matching stays keyed by her real name
    let lookCount = 0, videoCount = 0;
    for (const g of (state.generations ?? [])) {
      if ((g as any).feed !== true) continue;
      if (String((g as any).customerName ?? "").trim().toLowerCase() !== nmKey) continue;
      lookCount++; if ((g as any).videoUrl) videoCount++;
    }
    // Her looks (for the "Looks" stat) + her video clips (thumb strip). Match clips the SAME way
    // the profile card does — by curatorId OR name-slug — so the shared image mirrors it.
    const looksCount = (state.looks ?? []).filter((l: any) => l.curatorId === id).length;
    const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const nameSlug = slug(name);
    const thumbUrls: string[] = [];
    for (const g of (state.generations ?? [])) {
      const gg = g as any;
      if (gg.visitorId?.startsWith("admin-") || gg.hidden || gg.feed !== true) continue;
      const hers = gg.curatorId === id || slug(gg.customerName ?? "") === nameSlug;
      if (hers && gg.videoUrl && gg.imageUrl && thumbUrls.length < 7) thumbUrls.push(gg.imageUrl as string);
    }
    const followers = (state.follows ?? []).filter((f: any) => f.followeeType === "user" && f.followeeSlug === id).length;
    const p = await getPricingConfig();
    const value = fmtPriceCents(influencerPriceCents({
      name: nmKey, flagship: c.flagship, realModel: c.realModel === true, videoCount, lookCount,
      followerCount: followers, purchasedAt: c.purchasedAt, createdAt: c.createdAt,
      flagshipTier: c.flagshipTier, flagshipBases: [p.flagshipBase1Cents, p.flagshipBase2Cents, p.flagshipBase3Cents],
    }));
    const serial = (id || "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "LB0001";
    const photoUrl = c.photoUrl?.startsWith("http") ? c.photoUrl : (c.photoUrl ? await getSignedUrl(c.photoUrl).catch(() => "") : "");
    // Transcode the photo + all thumbnails to JPEG in parallel.
    const [photo, ...thumbs] = await Promise.all([toJpeg(origin, photoUrl, 828), ...thumbUrls.map(u => toJpeg(origin, u, 256))]);
    const forSale = typeof c.forSale === "boolean" ? c.forSale : !c.ownerEmail;
    const realModel = c.realModel === true;
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}]/gu;
    const tagline = String(c.motto || "Your vibe, every day").replace(emoji, "").trim();
    const bio = String(c.bio || c.motto || "").replace(emoji, "").trim();
    const brandList = String(c.brands || "").split(/[,;•]/).map((b: string) => b.trim()).filter(Boolean).slice(0, 6);
    const brandsText = brandList.length ? `Loves ${brandList.join(", ")}.` : "";
    const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
    // Country flag (real PNG from flagcdn — Satori can't render emoji flags) + English name.
    const cc = String(c.country || "").trim().toUpperCase();
    let flag = "", countryName = "";
    if (/^[A-Z]{2}$/.test(cc)) {
      try { countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc; } catch { countryName = cc; }
      try {
        const fr = await fetch(`https://flagcdn.com/w40/${cc.toLowerCase()}.png`);
        if (fr.ok) flag = `data:image/png;base64,${Buffer.from(await fr.arrayBuffer()).toString("base64")}`;
      } catch { /**/ }
    }
    const typeLabel = realModel ? "LB REAL INFLUENCER" : "AI LB INFLUENCER";
    const ownerName = (() => {
      const oe = String(c.ownerEmail || "").trim().toLowerCase();
      if (!oe) return "";
      const acc = (state.curators ?? []).find((x: any) => String(x.email || "").trim().toLowerCase() === oe) as any;
      const accName = acc ? (String(acc.modelName || "").trim() || [acc.firstName, acc.lastName].filter(Boolean).join(" ").trim()) : "";
      if (accName) return accName;
      const local = oe.split("@")[0].split(/[._-]/)[0];
      return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
    })();
    const ownerId = c.ownerEmail ? `#${crypto.createHash("sha1").update(String(c.ownerEmail).toLowerCase()).digest("hex").slice(0, 5).toUpperCase()}` : "";
    const owner = c.ownerHideName === true ? ownerId : [ownerName, ownerId].filter(Boolean).join(" · ");

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", padding: 20 }}>
         <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "linear-gradient(150deg, #17120d 0%, #0d0b0a 45%, #080605 100%)", color: "#fff", fontFamily: "sans-serif", borderRadius: 36, border: "5px solid #eab308", overflow: "hidden" }}>
          {/* Header — HER NAME (not over the video) + brand line, with the "LB" watermark behind. */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 122, padding: "0 30px", borderBottom: "1px solid rgba(251,191,36,0.25)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, left: -80, right: -80, bottom: -60, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "3px 8px", color: "rgba(253,224,120,0.18)", fontSize: 12, fontWeight: 800, lineHeight: 1, transform: "rotate(-24deg)" }}>
              {Array.from({ length: 260 }).map((_, i) => <span key={i}>LB</span>)}
            </div>
            <span style={{ fontSize: 46, fontWeight: 800, color: "#fff", zIndex: 1, lineHeight: 1.05 }}>{name}</span>
            {owner ? (
              <div style={{ display: "flex", alignItems: "center", marginTop: 5, background: "#fbbf24", borderRadius: 999, padding: "4px 18px", zIndex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#000" }}>OWNED BY {owner}</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", marginTop: 5, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(252,211,77,0.55)", borderRadius: 999, padding: "4px 22px", zIndex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "#fde68a" }}>AVAILABLE</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", marginTop: 5, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(252,211,77,0.3)", borderRadius: 999, padding: "3px 14px", zIndex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "#fbbf24" }}>LuxuryBandit.com <span style={{ color: "rgba(255,255,255,0.5)" }}>· Sponsor an AI Influencer</span></span>
            </div>
          </div>
          {/* photo + overlays */}
          <div style={{ position: "relative", display: "flex", flex: 1, width: "100%" }}>
            {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", width: "100%", height: "100%" }} />}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 320, display: "flex", backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4) 45%, rgba(0,0,0,0))" }} />
            <div style={{ position: "absolute", top: 22, left: 22, display: "flex", background: "rgba(0,0,0,0.55)", borderRadius: 999, padding: "7px 15px", fontSize: 21, fontWeight: 800, letterSpacing: 2 }}>Nº {serial}</div>
            {forSale && <div style={{ position: "absolute", top: 70, left: 22, display: "flex", background: "#f59e0b", borderRadius: 999, padding: "5px 15px", fontSize: 19, fontWeight: 800 }}>For sale</div>}
            {realModel && <div style={{ position: "absolute", top: forSale ? 112 : 70, left: 22, display: "flex", background: "rgba(255,255,255,0.9)", color: "#b45309", borderRadius: 999, padding: "5px 15px", fontSize: 19, fontWeight: 800 }}>Real</div>}
            <div style={{ position: "absolute", top: 22, right: 22, display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(252,211,77,0.7)", borderRadius: 999, padding: "9px 22px", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, left: -30, right: -30, bottom: -30, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "center", gap: "0 4px", transform: "rotate(-24deg)", color: "rgba(253,224,120,0.14)", fontSize: 8, fontWeight: 800, lineHeight: 1 }}>{Array.from({ length: 80 }).map((_, i) => <span key={i}>LB</span>)}</div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(252,211,77,0.9)", letterSpacing: 2, zIndex: 1, lineHeight: 1.1 }}>GS</span>
              <span style={{ fontSize: 32, fontWeight: 800, zIndex: 1, lineHeight: 1.05 }}>{Math.round(parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0).toLocaleString("en-US")}</span>
              <div style={{ display: "flex", alignItems: "center", marginTop: 2, zIndex: 1 }}>
                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "6px solid #fbbf24", marginRight: 5 }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", letterSpacing: 1 }}>TRENDING</span>
              </div>
            </div>
            <div style={{ position: "absolute", left: 26, bottom: 22, display: "flex", flexDirection: "column" }}>
              {tagline ? <span style={{ fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.95)", textShadow: "0 2px 14px rgba(0,0,0,1)" }}>{tagline}</span> : <span />}
              {owner ? (
                <span style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#fcd34d", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>Sponsored by {owner}</span>
              ) : (
                <span style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#fbbf24", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>No sponsor yet — be the first sponsor</span>
              )}
            </div>
          </div>
          {/* thumb strip */}
          {thumbs.filter(Boolean).length > 0 && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {thumbs.filter(Boolean).map((t, i) => (
                <div key={i} style={{ display: "flex", width: 74, height: 96, borderRadius: 8, overflow: "hidden", border: i === 0 ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.25)" }}>
                  <img src={t} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
          {/* profile data */}
          <div style={{ display: "flex", flexDirection: "column", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.5)" }}>
              <span>Model Nº {serial}</span>{created ? <span>CREATED {created.toUpperCase()}</span> : <span />}
            </div>
            <span style={{ marginTop: 8, fontSize: 16, fontWeight: 800, letterSpacing: 1, color: "rgba(252,211,77,0.85)" }}>{typeLabel}</span>
            {bio ? <span style={{ marginTop: 6, fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.72)" }}>{bio}</span> : <span />}
            {brandsText ? <span style={{ marginTop: 6, fontSize: 19, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{brandsText}</span> : <span />}
          </div>
          {/* Vanity stats REMOVED (2026-07-16) — no fake followers/likes/views on shared cards. */}
          {/* CTAs */}
          <div style={{ display: "flex", gap: 10, padding: "12px 14px" }}>
            {["Super Follow", "Chat with my AI"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, height: 48, borderRadius: 999, border: "1px solid rgba(255,255,255,0.25)", background: "#000", fontSize: 19, fontWeight: 800 }}>{t}</div>
            ))}
          </div>
          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 52, borderTop: "1px solid rgba(255,255,255,0.1)", letterSpacing: 6, fontSize: 17, fontWeight: 800 }}>
            <span style={{ color: "rgba(252,211,77,0.85)" }}>LUXURYBANDIT.COM</span>
            <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 12 }}>· AI INFLUENCER</span>
          </div>
         </div>
        </div>
      ),
      { width: 800, height: 1400 }
    );
  } catch {
    return new Response("Error", { status: 500 });
  }
}
