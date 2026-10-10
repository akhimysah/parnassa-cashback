// Catalogue des marchands partenaires. Les taux sont en pourcentage du montant payé,
// le plafond (facultatif) en centimes de cashback par achat.

export type Categorie = 'Mode' | 'Maison' | 'High-tech' | 'Voyage' | 'Courses' | 'Restaurants' | 'Beauté' | 'Loisirs';

export const CATEGORIES: Categorie[] = ['Mode', 'Maison', 'High-tech', 'Voyage', 'Courses', 'Restaurants', 'Beauté', 'Loisirs'];

export interface Marchand {
  id: string;
  nom: string;
  categorie: Categorie;
  taux: number;
  plafond?: number;
  /** Jours avant que le cashback passe de « en attente » à « disponible » (délai de rétractation). */
  delaiJours: number;
  couleur: string;
  accroche: string;
  aLaUne?: boolean;
  /** Bonus (en %) quand on convertit son cashback en carte cadeau de ce marchand. */
  bonusCarte?: number;
  /** Taux (en %) pour un paiement dans une boutique physique ; absent = vente en ligne uniquement. */
  enMagasin?: number;
}

export const MARCHANDS: Marchand[] = [
  { id: 'atelier-nord', nom: 'Atelier Nord', categorie: 'Mode', taux: 8, delaiJours: 30, couleur: '#0f766e', accroche: 'Prêt-à-porter éco-conçu', aLaUne: true , bonusCarte: 5 , enMagasin: 5 },
  { id: 'sneak-lab', nom: 'Sneak Lab', categorie: 'Mode', taux: 5, plafond: 2500, delaiJours: 30, couleur: '#ea580c', accroche: 'Baskets et streetwear' , bonusCarte: 4 , enMagasin: 3 },
  { id: 'maison-lune', nom: 'Maison Lune', categorie: 'Maison', taux: 6, delaiJours: 45, couleur: '#a16207', accroche: 'Déco, linge et luminaires' , bonusCarte: 6 , enMagasin: 4 },
  { id: 'bricoplus', nom: 'Brico+', categorie: 'Maison', taux: 3, plafond: 5000, delaiJours: 30, couleur: '#ca8a04', accroche: 'Bricolage et jardin' , enMagasin: 2 },
  { id: 'pixel', nom: 'Pixel Store', categorie: 'High-tech', taux: 2.5, plafond: 4000, delaiJours: 45, couleur: '#2563eb', accroche: 'Smartphones, PC, audio', aLaUne: true , bonusCarte: 3 , enMagasin: 1.5 },
  { id: 'gamezone', nom: 'GameZone', categorie: 'High-tech', taux: 4, delaiJours: 30, couleur: '#7c3aed', accroche: 'Jeux vidéo et consoles' , enMagasin: 3 },
  { id: 'cap-horizon', nom: 'Cap Horizon', categorie: 'Voyage', taux: 7, plafond: 15000, delaiJours: 60, couleur: '#0284c7', accroche: 'Hôtels dans 120 pays', aLaUne: true , bonusCarte: 5 },
  { id: 'railgo', nom: 'RailGo', categorie: 'Voyage', taux: 2, delaiJours: 30, couleur: '#be123c', accroche: 'Billets de train en Europe' },
  { id: 'panier-frais', nom: 'Panier Frais', categorie: 'Courses', taux: 3, plafond: 1500, delaiJours: 14, couleur: '#16a34a', accroche: 'Courses livrées en 2 h' , bonusCarte: 4 , enMagasin: 2 },
  { id: 'bio-coin', nom: 'Le Bio du Coin', categorie: 'Courses', taux: 5, delaiJours: 14, couleur: '#65a30d', accroche: 'Épicerie bio et vrac' , enMagasin: 4 },
  { id: 'miam', nom: 'Miam Express', categorie: 'Restaurants', taux: 10, plafond: 800, delaiJours: 7, couleur: '#dc2626', accroche: 'Livraison de repas', aLaUne: true , bonusCarte: 8 },
  { id: 'table-ronde', nom: 'La Table Ronde', categorie: 'Restaurants', taux: 12, delaiJours: 7, couleur: '#9f1239', accroche: 'Réservez, mangez, récupérez' , enMagasin: 10 },
  { id: 'eclat', nom: 'Éclat Beauté', categorie: 'Beauté', taux: 9, delaiJours: 30, couleur: '#db2777', accroche: 'Soins et parfums' , bonusCarte: 6 , enMagasin: 6 },
  { id: 'cine-pass', nom: 'CinéPass', categorie: 'Loisirs', taux: 15, plafond: 500, delaiJours: 7, couleur: '#4f46e5', accroche: 'Places de cinéma' , bonusCarte: 10 , enMagasin: 12 },
  { id: 'librairie-page', nom: 'Page Blanche', categorie: 'Loisirs', taux: 6, delaiJours: 30, couleur: '#475569', accroche: 'Livres et BD' , bonusCarte: 7 , enMagasin: 5 },
];

export function trouverMarchand(id: string | null): Marchand | undefined {
  return id ? MARCHANDS.find((m) => m.id === id) : undefined;
}
