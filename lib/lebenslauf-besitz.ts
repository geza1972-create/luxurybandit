import { leseLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { readKissLog } from "@/lib/try-this-look-store";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * WER DARF AM PROFIL ARBEITEN — ausfaktoriert aus `/api/lebenslauf-korrektur` (24.08.2026),
 * weil `/api/lebenslauf-match` (Anzeigen-Abgleich) dieselbe Prüfung ein zweites Mal braucht.
 * Zwei Kopien derselben Sicherheitslogik sind das Risiko, dass eine repariert wird und die
 * andere nicht (siehe Skill „reuse over new").
 *
 * Besitzer heisst: angemeldetes Konto mit der Profil-Adresse, das Gerät, das den Auftrag
 * angelegt hat (Kiss-Log `device`), oder der Admin.
 */
export async function darfAmProfilArbeiten(profil: LebenslaufProfil, device: string, request: Request): Promise<boolean> {
  if (await isAdminRequest(request).catch(() => false)) return true;
  const konto = await getSellerFromRequest(request).catch(() => null);
  const kontoMail = String(konto?.email ?? "").trim().toLowerCase();
  if (kontoMail && kontoMail === String(profil.email ?? "").trim().toLowerCase()) return true;
  if (device) {
    try {
      const eintrag = (await readKissLog()).find(e => e.id === profil.id);
      if (eintrag?.device && eintrag.device === device) return true;
    } catch { /* ohne Log entscheidet der Rest */ }
  }
  /* EINE BEWERBUNG ERBT DEN BESITZ VOM HAUPTPROFIL (Multi-Bewerbung, 25.08.2026): Die
     Version kopiert zwar die E-Mail (Konto-Weg greift oben direkt), aber der GERÄTE-Weg
     hängt am Kiss-Log-Auftrag, den nur das Hauptprofil hat. Eine Ebene reicht — ein
     Hauptprofil trägt nie selbst eine basisId (die Erzeugungs-Route löst Ketten auf). */
  if (profil.basisId && profil.basisId !== profil.id) {
    const basis = await leseLebenslauf(profil.basisId).catch(() => null);
    if (basis && !basis.basisId) return darfAmProfilArbeiten(basis, device, request);
  }
  return false;
}
