// Codes promo des marchands partenaires, cumulables avec le cashback.

export interface CodePromo {
  code: string;
  marchandId: string;
  description: string;
  /** Remise en % du panier, ou montant fixe en centimes. */
  remise: { type: 'pourcent'; valeur: number } | { type: 'fixe'; valeur: number };
  /** Panier minimum en centimes. */
  minimum: number;
}

export const CODES: CodePromo[] = [
  { code: 'NORD10', marchandId: 'atelier-nord', description: '−10 % dès 80 €', remise: { type: 'pourcent', valeur: 10 }, minimum: 8000 },
  { code: 'SNEAK15', marchandId: 'sneak-lab', description: '−15 € dès 100 €', remise: { type: 'fixe', valeur: 1500 }, minimum: 10_000 },
  { code: 'LUNE20', marchandId: 'maison-lune', description: '−20 % sur tout', remise: { type: 'pourcent', valeur: 20 }, minimum: 0 },
  { code: 'PIXEL30', marchandId: 'pixel', description: '−30 € dès 300 €', remise: { type: 'fixe', valeur: 3000 }, minimum: 30_000 },
  { code: 'GAME5', marchandId: 'gamezone', description: '−5 € dès 40 €', remise: { type: 'fixe', valeur: 500 }, minimum: 4000 },
  { code: 'HORIZON', marchandId: 'cap-horizon', description: '−8 % sur les hôtels', remise: { type: 'pourcent', valeur: 8 }, minimum: 0 },
  { code: 'FRAIS10', marchandId: 'panier-frais', description: '−10 € dès 60 €', remise: { type: 'fixe', valeur: 1000 }, minimum: 6000 },
  { code: 'MIAMMIAM', marchandId: 'miam', description: 'Livraison offerte (−3 €)', remise: { type: 'fixe', valeur: 300 }, minimum: 1500 },
  { code: 'ECLAT', marchandId: 'eclat', description: '−12 % dès 50 €', remise: { type: 'pourcent', valeur: 12 }, minimum: 5000 },
  { code: 'LIRE5', marchandId: 'librairie-page', description: '−5 % sur les livres', remise: { type: 'pourcent', valeur: 5 }, minimum: 0 },
];

export function codesDe(marchandId: string): CodePromo[] {
  return CODES.filter((c) => c.marchandId === marchandId);
}

/** Remise (centimes) d'un code sur un panier ; lève une erreur lisible si le code ne s'applique pas. */
export function appliquerCode(marchandId: string, saisie: string, panier: number): { code: CodePromo; remise: number } {
  const propre = saisie.trim().toUpperCase();
  const code = CODES.find((c) => c.code === propre);
  if (!code) throw new Error('Code inconnu');
  if (code.marchandId !== marchandId) throw new Error("Ce code n'est pas valable chez ce marchand");
  if (panier < code.minimum) throw new Error(`Panier minimum : ${(code.minimum / 100).toFixed(2).replace('.', ',')} €`);
  const remise = code.remise.type === 'pourcent' ? Math.round((panier * code.remise.valeur) / 100) : code.remise.valeur;
  return { code, remise: Math.min(remise, panier) };
}
