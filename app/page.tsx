import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // The start page IS the Models marketplace. Both a full load of "/" (no rewrite anymore)
  // and client-side nav to "/" land here and redirect to the models gallery, so ?view=models
  // is always present in the URL (the Models tab reads it on the client).
  redirect("/stores?view=models");
}
