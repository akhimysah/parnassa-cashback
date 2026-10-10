// Série hebdomadaire : semaines consécutives avec au moins un achat chez un partenaire.

import { crediterBonus, numeroSemaine, type Etat } from './moteur';

export const PALIER_SERIE = 4;
export const BONUS_SERIE = 300;

export interface Serie {
  /** Nombre de semaines consécutives (la semaine en cours compte si elle a déjà un achat). */
  semaines: number;
  /** Vrai si la semaine en cours a déjà son achat. */
  semaineFaite: boolean;
  /** Numéro de la première semaine de la série. */
  debut: number;
  /** Paliers de 4 semaines atteints et pas encore récompensés. */
  aRecuperer: number;
}

export function cleSerie(debut: number, palier: number): string {
  return `serie:${debut}:${palier}`;
}

export function serie(etat: Etat, t: number): Serie {
  const semaines = new Set(etat.achats.filter((a) => a.statut !== 'annule' && a.marchandId !== null && a.date <= t).map((a) => numeroSemaine(a.date)));
  const courante = numeroSemaine(t);
  const semaineFaite = semaines.has(courante);
  let n = semaineFaite ? courante : courante - 1;
  let total = 0;
  while (semaines.has(n)) {
    total++;
    n--;
  }
  const debut = n + 1;
  let aRecuperer = 0;
  for (let p = 1; p <= Math.floor(total / PALIER_SERIE); p++) if (!etat.bonus.some((b) => b.cle === cleSerie(debut, p))) aRecuperer++;
  return { semaines: total, semaineFaite, debut, aRecuperer };
}

/** Crédite tous les paliers de série atteints et non récompensés. */
export function recupererSerie(etat: Etat, t: number): Etat {
  const s = serie(etat, t);
  if (!s.aRecuperer) throw new Error('Aucune récompense de série à récupérer');
  let e = etat;
  for (let p = 1; p <= Math.floor(s.semaines / PALIER_SERIE); p++) {
    const cle = cleSerie(s.debut, p);
    if (!e.bonus.some((b) => b.cle === cle)) e = crediterBonus(e, cle, `Série de ${p * PALIER_SERIE} semaines`, BONUS_SERIE, t);
  }
  return e;
}
