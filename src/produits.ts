// Produits de la boutique de démonstration, par catégorie (prix en centimes).

import type { Categorie } from './marchands';

export interface Produit {
  id: string;
  nom: string;
  prix: number;
  emoji: string;
}

export const PRODUITS: Record<Categorie, Produit[]> = {
  Mode: [
    { id: 'pull', nom: 'Pull en laine mérinos', prix: 6900, emoji: '🧶' },
    { id: 'jean', nom: 'Jean droit brut', prix: 8900, emoji: '👖' },
    { id: 'baskets', nom: 'Baskets blanches', prix: 11_900, emoji: '👟' },
    { id: 'tshirt', nom: 'T-shirt coton bio', prix: 2900, emoji: '👕' },
  ],
  Maison: [
    { id: 'lampe', nom: 'Lampe en laiton', prix: 7900, emoji: '💡' },
    { id: 'plaid', nom: 'Plaid en lin', prix: 5900, emoji: '🛋️' },
    { id: 'vase', nom: 'Vase en grès', prix: 3400, emoji: '🏺' },
    { id: 'perceuse', nom: 'Perceuse sans fil', prix: 12_900, emoji: '🔧' },
  ],
  'High-tech': [
    { id: 'casque', nom: 'Casque à réduction de bruit', prix: 24_900, emoji: '🎧' },
    { id: 'chargeur', nom: 'Chargeur rapide 65 W', prix: 3900, emoji: '🔌' },
    { id: 'manette', nom: 'Manette sans fil', prix: 6900, emoji: '🎮' },
    { id: 'tablette', nom: 'Tablette 11 pouces', prix: 39_900, emoji: '📱' },
  ],
  Voyage: [
    { id: 'nuit', nom: 'Nuit en hôtel 4★', prix: 14_900, emoji: '🏨' },
    { id: 'weekend', nom: 'Week-end à Lisbonne', prix: 32_000, emoji: '🌍' },
    { id: 'train', nom: 'Paris – Lyon en 1re', prix: 8900, emoji: '🚄' },
  ],
  Courses: [
    { id: 'panier', nom: 'Panier de la semaine', prix: 6500, emoji: '🧺' },
    { id: 'fruits', nom: 'Fruits de saison (3 kg)', prix: 1490, emoji: '🍎' },
    { id: 'cafe', nom: 'Café en grains (1 kg)', prix: 2290, emoji: '☕' },
    { id: 'vrac', nom: 'Épicerie vrac', prix: 3200, emoji: '🫙' },
  ],
  Restaurants: [
    { id: 'pizza', nom: 'Pizza napolitaine', prix: 1450, emoji: '🍕' },
    { id: 'sushi', nom: 'Plateau sushi', prix: 2890, emoji: '🍣' },
    { id: 'burger', nom: 'Menu burger', prix: 1690, emoji: '🍔' },
    { id: 'diner', nom: 'Dîner pour deux', prix: 7800, emoji: '🍷' },
  ],
  Beauté: [
    { id: 'serum', nom: 'Sérum éclat', prix: 4200, emoji: '🧴' },
    { id: 'parfum', nom: 'Eau de parfum 50 ml', prix: 8900, emoji: '🌸' },
    { id: 'creme', nom: 'Crème hydratante', prix: 2600, emoji: '✨' },
  ],
  Loisirs: [
    { id: 'place', nom: 'Place de cinéma', prix: 1250, emoji: '🎬' },
    { id: 'roman', nom: 'Roman grand format', prix: 2200, emoji: '📚' },
    { id: 'bd', nom: 'Bande dessinée', prix: 1595, emoji: '📖' },
    { id: 'coffret', nom: 'Coffret 4 places', prix: 4400, emoji: '🎟️' },
  ],
};

export type Panier = Record<string, number>;

export function totalPanier(produits: Produit[], panier: Panier): number {
  return produits.reduce((s, p) => s + p.prix * (panier[p.id] ?? 0), 0);
}

export function ajouter(panier: Panier, id: string, delta: number): Panier {
  const n = Math.max(0, Math.min(9, (panier[id] ?? 0) + delta));
  const suivant = { ...panier, [id]: n };
  if (!n) delete suivant[id];
  return suivant;
}
