// Associations de démonstration (fictives) auxquelles on peut donner son cashback.

export interface Association {
  id: string;
  nom: string;
  cause: string;
  description: string;
  icone: string;
  couleur: string;
}

export const ASSOCIATIONS: Association[] = [
  { id: 'repas', nom: 'Tables Partagées', cause: 'Aide alimentaire', description: 'Repas chauds et colis pour les familles en difficulté.', icone: '🍲', couleur: '#ea580c' },
  { id: 'forets', nom: 'Forêts Vivantes', cause: 'Environnement', description: 'Replantation de haies et de forêts locales.', icone: '🌳', couleur: '#16a34a' },
  { id: 'recherche', nom: 'Fonds Espoir Recherche', cause: 'Santé', description: 'Financement de la recherche sur les maladies rares.', icone: '🔬', couleur: '#2563eb' },
  { id: 'ecole', nom: 'Cartables pour Tous', cause: 'Éducation', description: 'Fournitures et soutien scolaire pour les enfants.', icone: '🎒', couleur: '#9333ea' },
];

/** Réduction d'impôt française pour les dons aux organismes d'intérêt général (66 %). */
export const TAUX_REDUCTION = 0.66;

export function trouverAssociation(id: string | undefined): Association | undefined {
  return ASSOCIATIONS.find((a) => a.id === id);
}
