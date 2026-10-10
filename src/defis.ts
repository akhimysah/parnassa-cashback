// Défis du mois : trois missions tirées chaque mois parmi un catalogue, récompensées par un bonus.

import { trouverMarchand, type Categorie } from './marchands';
import { aleaSuivant, crediterBonus, graineDe, indiceAlea, type Achat, type Etat } from './moteur';

type Condition =
  | { type: 'achats'; n: number; categorie?: Categorie; partenaires?: boolean }
  | { type: 'partenaires-distincts'; n: number }
  | { type: 'gros-achat'; montant: number }
  | { type: 'depense-partenaires'; montant: number };

export interface Defi {
  id: string;
  titre: string;
  description: string;
  icone: string;
  condition: Condition;
  recompense: number;
}

export const CATALOGUE: Defi[] = [
  { id: 'gourmand', titre: 'Gourmand', icone: '🍽️', description: '3 achats chez des restaurants partenaires', condition: { type: 'achats', n: 3, categorie: 'Restaurants' }, recompense: 300 },
  { id: 'explorateur', titre: 'Explorateur', icone: '🧭', description: 'Achetez chez 4 partenaires différents', condition: { type: 'partenaires-distincts', n: 4 }, recompense: 500 },
  { id: 'gros-panier', titre: 'Gros panier', icone: '🛍️', description: 'Un achat de 100 € ou plus chez un partenaire', condition: { type: 'gros-achat', montant: 10_000 }, recompense: 400 },
  { id: 'fidele', titre: 'Fidèle', icone: '💳', description: '5 paiements par carte, partenaires ou non', condition: { type: 'achats', n: 5 }, recompense: 200 },
  { id: 'voyageur', titre: 'Voyageur', icone: '✈️', description: 'Réservez un voyage chez un partenaire', condition: { type: 'achats', n: 1, categorie: 'Voyage' }, recompense: 500 },
  { id: 'style', titre: 'Stylé', icone: '👟', description: '2 achats mode chez des partenaires', condition: { type: 'achats', n: 2, categorie: 'Mode' }, recompense: 300 },
  { id: 'panier-malin', titre: 'Panier malin', icone: '🥕', description: '4 courses chez des partenaires', condition: { type: 'achats', n: 4, categorie: 'Courses' }, recompense: 300 },
  { id: 'grand-acheteur', titre: 'Grand acheteur', icone: '🏆', description: '300 € dépensés chez des partenaires', condition: { type: 'depense-partenaires', montant: 30_000 }, recompense: 600 },
];

export const DEFIS_PAR_MOIS = 3;

/** « 2026-10 » en heure locale. */
export function cleMois(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function debutMois(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function finMois(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export function defisDuMois(t: number): Defi[] {
  const [a, m] = cleMois(t).split('-').map(Number);
  let graine = graineDe(a * 12 + m);
  const restants = [...CATALOGUE];
  const choisis: Defi[] = [];
  while (choisis.length < DEFIS_PAR_MOIS) {
    graine = aleaSuivant(graine);
    choisis.push(restants.splice(indiceAlea(graine, restants.length), 1)[0]);
  }
  return choisis;
}

function achatsDuMois(etat: Etat, t: number): Achat[] {
  const debut = debutMois(t);
  const fin = finMois(t);
  return etat.achats.filter((a) => a.statut !== 'annule' && a.date >= debut && a.date < fin && a.date <= t);
}

export interface Avancement {
  defi: Defi;
  fait: number;
  objectif: number;
  reussi: boolean;
  reclame: boolean;
  cle: string;
}

export function avancement(etat: Etat, defi: Defi, t: number): Avancement {
  const achats = achatsDuMois(etat, t);
  const partenaires = achats.filter((a) => a.marchandId !== null);
  const c = defi.condition;
  let fait: number;
  let objectif: number;
  switch (c.type) {
    case 'achats': {
      const base = c.categorie || c.partenaires ? partenaires : achats;
      fait = base.filter((a) => !c.categorie || trouverMarchand(a.marchandId)?.categorie === c.categorie).length;
      objectif = c.n;
      break;
    }
    case 'partenaires-distincts':
      fait = new Set(partenaires.map((a) => a.marchandId)).size;
      objectif = c.n;
      break;
    case 'gros-achat':
      fait = partenaires.some((a) => a.montant >= c.montant) ? 1 : 0;
      objectif = 1;
      break;
    case 'depense-partenaires':
      fait = partenaires.reduce((s, a) => s + a.montant, 0);
      objectif = c.montant;
      break;
  }
  const cle = `${cleMois(t)}:${defi.id}`;
  return { defi, fait: Math.min(fait, objectif), objectif, reussi: fait >= objectif, reclame: etat.bonus.some((b) => b.cle === cle), cle };
}

export function reclamerDefi(etat: Etat, defiId: string, t: number): Etat {
  const defi = defisDuMois(t).find((d) => d.id === defiId);
  if (!defi) throw new Error("Ce défi n'est pas au programme du mois");
  const a = avancement(etat, defi, t);
  if (!a.reussi) throw new Error('Défi pas encore réussi');
  return crediterBonus(etat, a.cle, `Défi « ${defi.titre} »`, defi.recompense, t);
}
