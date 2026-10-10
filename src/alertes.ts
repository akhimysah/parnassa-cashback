// Alertes de taux : prévenir quand un marchand atteint un seuil (boost ou offre flash).

import { trouverMarchand } from './marchands';
import { finDeSemaine, debutJour, offreFlash, palierActuel, SEMAINE, tauxMarchand, type AlerteTaux, type Etat } from './moteur';

export const MAX_ALERTES = 10;

export function ajouterAlerte(etat: Etat, marchandId: string, seuil: number, t: number): Etat {
  const m = trouverMarchand(marchandId);
  if (!m) throw new Error('Marchand inconnu');
  const mult = palierActuel(etat, t).palier.multiplicateur;
  if (!Number.isFinite(seuil) || seuil <= m.taux * mult) throw new Error(`Choisissez un seuil au-dessus du taux habituel (${(m.taux * mult).toLocaleString('fr-FR')} %)`);
  if (seuil > 50) throw new Error('Seuil trop élevé');
  if (etat.alertes.length >= MAX_ALERTES) throw new Error(`${MAX_ALERTES} alertes au maximum`);
  const sansDoublon = etat.alertes.filter((a) => a.marchandId !== marchandId);
  const alerte: AlerteTaux = { id: `al-${marchandId}-${t.toString(36)}`, marchandId, seuil: Math.round(seuil * 100) / 100, date: t };
  return { ...etat, alertes: [alerte, ...sansDoublon] };
}

export function supprimerAlerte(etat: Etat, id: string): Etat {
  return { ...etat, alertes: etat.alertes.filter((a) => a.id !== id) };
}

export interface Declenchement {
  alerte: AlerteTaux;
  taux: number;
  /** Début de la promo qui déclenche (minuit pour un flash, lundi pour un boost). */
  depuis: number;
  type: 'flash' | 'boost';
}

/** Alertes dont le seuil est atteint en ce moment (le seuil dépassant le taux habituel, c'est forcément un boost ou un flash). */
export function alertesDeclenchees(etat: Etat, t: number): Declenchement[] {
  const mult = palierActuel(etat, t).palier.multiplicateur;
  const flash = offreFlash(t);
  return etat.alertes.flatMap((alerte) => {
    const taux = tauxMarchand(alerte.marchandId, t) * mult;
    if (taux < alerte.seuil) return [];
    const type = flash.marchandId === alerte.marchandId ? 'flash' : 'boost';
    const depuis = type === 'flash' ? debutJour(t) : finDeSemaine(t) - SEMAINE;
    return [{ alerte, taux, depuis, type } as Declenchement];
  });
}
