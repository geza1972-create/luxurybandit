import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Community is the start page. The LuxbanditCut workspace lives at
  // /tools/luxbanditcut (and is reused on creator workspace routes).
  redirect("/stores?tab=community");
}
