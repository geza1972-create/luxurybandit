import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Home (the feed grid) is the start page.
  redirect("/stores");
}
