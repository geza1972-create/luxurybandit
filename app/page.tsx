import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Startseite = Models-Galerie. Wer luxurybandit.com öffnet, landet bei den Models.
  redirect("/stores?view=models");
}
