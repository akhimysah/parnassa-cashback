// Calendrier des promos (tirages déterministes : on peut les annoncer à l'avance) et historique des taux.

import { trouverMarchand } from './marchands';
import { boostsDeLaSemaine, COEF_BOOST, debutJour, finDeSemaine, JOUR, offreFlash, SEMAINE } from './moteur';

export interface JourFlash {
  debut: number;
  marchandId: string;
  taux: number;
}

export interface SemaineBoost {
  debut: number;
  fin: number;
  marchandIds: string[];
}

/** Offres flash des `n` prochains jours, aujourd'hui compris. */
export function flashsAVenir(t: number, n = 7): JourFlash[] {
  const jours: JourFlash[] = [];
  let jour = debutJour(t);
  for (let i = 0; i < n; i++) {
    const f = offreFlash(jour + 12 * 3_600_000);
    jours.push({ debut: jour, marchandId: f.marchandId, taux: f.taux });
    jour = debutJour(f.fin + 3_600_000);
  }
  return jours;
}

/** Boosts des `n` prochaines semaines, semaine en cours comprise. */
export function boostsAVenir(t: number, n = 4): SemaineBoost[] {
  const semaines: SemaineBoost[] = [];
  let fin = finDeSemaine(t);
  for (let i = 0; i < n; i++) {
    const milieu = fin - SEMAINE / 2;
    semaines.push({ debut: fin - SEMAINE, fin, marchandIds: boostsDeLaSemaine(milieu) });
    fin = finDeSemaine(fin + 3_600_000);
  }
  return semaines;
}

export interface PointTaux {
  debut: number;
  /** Taux le plus haut de la semaine (boost ou flash compris). */
  max: number;
  booste: boolean;
  flash: boolean;
}

/** Taux d'un marchand semaine par semaine : `avant` semaines passées et `apres` à venir. */
export function historiqueTaux(marchandId: string, t: number, avant = 6, apres = 2): PointTaux[] {
  const m = trouverMarchand(marchandId);
  if (!m) return [];
  const points: PointTaux[] = [];
  const finCourante = finDeSemaine(t);
  for (let i = -avant; i <= apres; i++) {
    const fin = finDeSemaine(finCourante + i * SEMAINE - SEMAINE / 2);
    const debut = fin - SEMAINE;
    const booste = boostsDeLaSemaine(debut + SEMAINE / 2).includes(m.id);
    let flashTaux = 0;
    for (let j = debut + 12 * 3_600_000; j < fin; j += JOUR) {
      const f = offreFlash(j);
      if (f.marchandId === m.id) flashTaux = Math.max(flashTaux, f.taux);
    }
    points.push({ debut, max: Math.max(m.taux * (booste ? COEF_BOOST : 1), flashTaux), booste, flash: flashTaux > 0 });
  }
  return points;
}

/** Prochaine promo (boost ou flash) d'un marchand dans les `jours` à venir, ou null. */
export function prochainePromo(marchandId: string, t: number, jours = 28): { quand: number; type: 'boost' | 'flash'; taux: number } | null {
  let jour = debutJour(t);
  for (let i = 0; i < jours; i++) {
    const midi = jour + 12 * 3_600_000;
    const f = offreFlash(midi);
    if (f.marchandId === marchandId) return { quand: jour, type: 'flash', taux: f.taux };
    if (boostsDeLaSemaine(midi).includes(marchandId)) return { quand: jour, type: 'boost', taux: trouverMarchand(marchandId)!.taux * COEF_BOOST };
    jour = debutJour(f.fin + 3_600_000);
  }
  return null;
}
