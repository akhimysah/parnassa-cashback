// Classement du mois entre amis : vos filleuls et quelques amis de démonstration (gains simulés).

import { cleMois } from './defis';
import { aleaSuivant, graineDe, type Etat } from './moteur';
import { gainsDu } from './recap';

export const AMIS_DEMO = ['Camille', 'Yanis', 'Inès', 'Hugo'];

export interface Participant {
  nom: string;
  gains: number;
  moi: boolean;
}

function hacher(texte: string): number {
  let h = 0;
  for (const c of texte) h = Math.imul(h ^ c.codePointAt(0)!, 0x01000193);
  return h;
}

/** Gains simulés d'un ami pour le mois : stables dans le mois, ils grandissent avec les jours écoulés. */
export function gainsAmi(nom: string, t: number): number {
  const cle = cleMois(t);
  const graine = aleaSuivant(graineDe(hacher(`${nom}:${cle}`)));
  const potentiel = 500 + Math.floor((graine / 0x80000000) * 5500); // 5 à 60 € sur un mois complet
  const d = new Date(t);
  const jours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.round((potentiel * d.getDate()) / jours);
}

export function classement(etat: Etat, t: number): Participant[] {
  const noms = [...new Set([...etat.parrainages.map((p) => p.prenom), ...AMIS_DEMO])];
  const participants: Participant[] = [
    { nom: 'Vous', gains: gainsDu(etat, cleMois(t)), moi: true },
    ...noms.map((nom) => ({ nom, gains: gainsAmi(nom, t), moi: false })),
  ];
  return participants.sort((a, b) => b.gains - a.gains || Number(b.moi) - Number(a.moi));
}
