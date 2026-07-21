import { redirect } from "next/navigation";

// „/bella" ist umgezogen ins Themen-Schema /<thema>/<model>.
// Bella-Wetter lebt jetzt unter /wetter/bella; alte Links landen dort.
export const dynamic = "force-dynamic";

export default function BellaPage() {
  redirect("/wetter/bella");
}
