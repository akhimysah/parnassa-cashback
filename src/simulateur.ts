// Simulateur « Combien puis-je gagner ? » : meilleur partenaire de chaque catégorie, au palier actuel.

import { CATEGORIES, MARCHANDS, type Categorie, type Marchand } from './marchands';
import { TAUX_BASE } from './moteur';

export interface LigneEstimation {
  categorie: Categorie;
  depense: number;
  marchand: Marchand;
  mensuel: number;
}

/** Montants mensuels proposés par défaut (centimes), proches d'un budget moyen. */
export const DEPENSES_TYPE: Record<Categorie, number> = {
  Mode: 6000,
  Maison: 4000,
  'High-tech': 3000,
  Voyage: 8000,
  Courses: 30_000,
  Restaurants: 8000,
  Beauté: 2000,
  Loisirs: 3000,
};

export function meilleurMarchand(categorie: Categorie): Marchand {
  return MARCHANDS.filter((m) => m.categorie === categorie).sort((a, b) => b.taux - a.taux)[0];
}

/**
 * Estimation hors boosts et offres flash (prudente). Les plafonds par achat sont ignorés :
 * on suppose des achats assez petits pour ne pas les atteindre.
 */
export function estimer(depenses: Partial<Record<Categorie, number>>, autres: number, multiplicateur: number) {
  const lignes: LigneEstimation[] = CATEGORIES.map((categorie) => {
    const depense = Math.max(0, depenses[categorie] ?? 0);
    const marchand = meilleurMarchand(categorie);
    return { categorie, depense, marchand, mensuel: Math.floor((depense * marchand.taux * multiplicateur) / 100) };
  });
  const horsPartenaires = Math.floor((Math.max(0, autres) * TAUX_BASE * multiplicateur) / 100);
  const mensuel = lignes.reduce((s, l) => s + l.mensuel, 0) + horsPartenaires;
  return { lignes, horsPartenaires, mensuel, annuel: mensuel * 12 };
}
