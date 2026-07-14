"use client";

// Inline text link that opens the shared buy form (InfluencerFormDialog) via the same
// window event the CTA button and model cards use. Lets a server component embed a
// clickable "…or create your own" inside a paragraph.
export default function BuyFormLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const open = () => { try { window.dispatchEvent(new CustomEvent("lb-buy-influencer")); } catch { /**/ } };
  return <button type="button" onClick={open} className={className}>{children}</button>;
}
