import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // Startseite = die THEMEN (Owner-Entscheidung): dort sieht der Besucher sofort, was die App
  // kann — Wetter, Try-On, Kuss, Idol, Geburtstag. Zu den Models führt oben ein eigener Button.
  redirect("/themes");
}
