import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Home = the Fashionshow GRID overview (hero + tabs + 3-col grid), not the
  // immersive reel. Tapping any tile still opens the full-screen reel.
  redirect("/stores?view=grid");
}
