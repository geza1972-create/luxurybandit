import Link from "next/link";

// Inline text link that leads to the existing application form (/curators/apply) — lets a
// server component embed a clickable "…or create your own" inside a paragraph.
export default function BuyFormLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <Link href="/curators/apply" className={className}>{children}</Link>;
}
