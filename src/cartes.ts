// Cartes cadeaux : le cashback disponible est converti en bon d'achat chez un partenaire, avec un bonus.

import { trouverMarchand } from './marchands';
import { genererCode, soldes, verser, type CarteCadeau, type Etat } from './moteur';

/** Montants proposés (en centimes de cashback dépensé). */
export const MONTANTS_CARTE = [1000, 2000, 5000, 10_000];

export function valeurCarte(marchandId: string, paye: number): number {
  const bonus = trouverMarchand(marchandId)?.bonusCarte ?? 0;
  return Math.round(paye * (1 + bonus / 100));
}

export function acheterCarte(etat: Etat, marchandId: string, paye: number, t: number, alea: () => number = Math.random): Etat {
  const marchand = trouverMarchand(marchandId);
  if (!marchand?.bonusCarte) throw new Error("Pas de carte cadeau chez ce marchand");
  if (!MONTANTS_CARTE.includes(paye)) throw new Error('Montant de carte non proposé');
  if (soldes(etat).disponible < paye) throw new Error('Solde disponible insuffisant');
  const apres = verser(etat, t, 'carte', paye);
  const carte: CarteCadeau = {
    id: apres.versements[0].id,
    marchandId,
    paye,
    valeur: valeurCarte(marchandId, paye),
    code: genererCode(alea, '', 16).replace(/(.{4})(?=.)/g, '$1-'),
    date: t,
    utilisee: false,
  };
  return { ...apres, cartes: [carte, ...apres.cartes] };
}

export function marquerCarte(etat: Etat, carteId: string, utilisee: boolean): Etat {
  return { ...etat, cartes: etat.cartes.map((c) => (c.id === carteId ? { ...c, utilisee } : c)) };
}
