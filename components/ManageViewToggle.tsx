// Kunde/Admin-Umschalter für Manage-Landings (CI wie Wetter). Nur mit ?admin=1 sichtbar.
// „Kunde" zeigt die Kundenansicht (Hero/Funnel), „Admin" das Card-Tool + Abonnenten.
// Reine <a>-Links → funktioniert in Server-Components; behält ?admin=1, setzt ?view=.
export default function ManageViewToggle({ view }: { view: "kunde" | "admin" }) {
  const tab = "flex-1 rounded-full py-2 transition";
  return (
    <div className="mx-auto mt-3 flex max-w-[300px] gap-1.5 rounded-full border border-white/10 bg-white/[0.04] p-1 text-center text-[12px] font-black">
      <a href="?admin=1&view=kunde" className={`${tab} ${view === "kunde" ? "bg-amber-400 text-black" : "text-white/60"}`}>👤 Kunde</a>
      <a href="?admin=1&view=admin" className={`${tab} ${view === "admin" ? "bg-amber-400 text-black" : "text-white/60"}`}>🛠 Admin</a>
    </div>
  );
}
