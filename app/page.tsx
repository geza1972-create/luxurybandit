import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // The homepage IS the "Own an AI Influencer" marketing landing. On a full load of
  // "/", the next.config rewrite serves it directly; this redirect covers CLIENT-side
  // nav to "/" (e.g. the logo → home), which bypasses that rewrite and would otherwise
  // fall through to the old /stores redirect. Keep both pointing at the landing.
  redirect("/own-influencer");
}
