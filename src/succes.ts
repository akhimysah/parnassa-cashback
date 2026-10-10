// Succès : badges débloqués une fois pour toutes, à la première fois où leur condition est remplie.

import { trouverMarchand } from './marchands';
import { boostsDeLaSemaine, offreFlash, palierActuel, PALIERS, type Achat, type Etat } from './moteur';
import { serie } from './serie';

export interface Succes {
  id: string;
  titre: string;
  description: string;
  icone: string;
  /** Avancement actuel et objectif. */
  mesure: (etat: Etat, t: number) => [number, number];
}

const valides = (e: Etat): Achat[] => e.achats.filter((a) => a.statut !== 'annule');
const partenaires = (e: Etat): Achat[] => valides(e).filter((a) => a.marchandId !== null);
const gagne = (e: Etat): number => valides(e).reduce((s, a) => s + a.cashback, 0) + e.bonus.reduce((s, b) => s + b.montant, 0);
const rangPalier = (e: Etat, t: number): number => PALIERS.indexOf(palierActuel(e, t).palier);
const depotsCoffre = (e: Etat): number => e.versements.filter((v) => v.destination === 'coffre').reduce((s, v) => s + v.montant, 0);
const dons = (e: Etat): number => e.versements.filter((v) => v.destination === 'don').reduce((s, v) => s + v.montant, 0);
const defisReussis = (e: Etat): number => e.bonus.filter((b) => /^\d{4}-\d{2}:/.test(b.cle)).length;

export const SUCCES: Succes[] = [
  { id: 'premier-achat', titre: 'Premier pas', icone: '👣', description: 'Un premier achat chez un partenaire', mesure: (e) => [partenaires(e).length, 1] },
  { id: 'habitue', titre: 'Habitué', icone: '🛒', description: '10 achats chez des partenaires', mesure: (e) => [partenaires(e).length, 10] },
  { id: 'pilier', titre: 'Pilier', icone: '🏛️', description: '50 achats chez des partenaires', mesure: (e) => [partenaires(e).length, 50] },
  { id: 'dix-euros', titre: 'Premiers 10 €', icone: '💶', description: '10 € de cashback gagnés', mesure: (e) => [gagne(e), 1000] },
  { id: 'cent-euros', titre: 'Cent balles', icone: '💰', description: '100 € de cashback gagnés', mesure: (e) => [gagne(e), 10_000] },
  { id: 'explorateur', titre: 'Explorateur', icone: '🧭', description: 'Des achats dans 5 catégories', mesure: (e) => [new Set(partenaires(e).map((a) => trouverMarchand(a.marchandId)?.categorie)).size, 5] },
  { id: 'touche-a-tout', titre: 'Touche-à-tout', icone: '🎨', description: 'Des achats chez 10 marchands différents', mesure: (e) => [new Set(partenaires(e).map((a) => a.marchandId)).size, 10] },
  { id: 'flash', titre: 'Éclair', icone: '⚡', description: "Profiter d'une offre flash", mesure: (e) => [partenaires(e).some((a) => offreFlash(a.date).marchandId === a.marchandId) ? 1 : 0, 1] },
  { id: 'chasseur', titre: 'Chasseur de boosts', icone: '🎯', description: '3 achats chez des marchands boostés', mesure: (e) => [partenaires(e).filter((a) => boostsDeLaSemaine(a.date).includes(a.marchandId!)).length, 3] },
  { id: 'argent', titre: 'Palier Argent', icone: '🥈', description: 'Atteindre le palier Argent', mesure: (e, t) => [Math.min(rangPalier(e, t), 1), 1] },
  { id: 'or', titre: 'Palier Or', icone: '🥇', description: 'Atteindre le palier Or', mesure: (e, t) => [Math.min(rangPalier(e, t), 2), 2] },
  { id: 'platine', titre: 'Palier Platine', icone: '💎', description: 'Atteindre le palier Platine', mesure: (e, t) => [rangPalier(e, t), 3] },
  { id: 'regulier', titre: 'Régulier', icone: '🔥', description: 'Une série de 8 semaines', mesure: (e, t) => [serie(e, t).semaines, 8] },
  { id: 'challenger', titre: 'Challenger', icone: '🏆', description: '5 défis du mois réussis', mesure: (e) => [defisReussis(e), 5] },
  { id: 'parrain', titre: 'Parrain', icone: '💜', description: 'Parrainer un ami', mesure: (e) => [e.parrainages.length, 1] },
  { id: 'ambassadeur', titre: 'Ambassadeur', icone: '📣', description: 'Parrainer 5 amis', mesure: (e) => [e.parrainages.length, 5] },
  { id: 'epargnant', titre: 'Fourmi', icone: '🐜', description: 'Mettre 50 € de côté dans le coffre', mesure: (e) => [depotsCoffre(e), 5000] },
  { id: 'genereux', titre: 'Généreux', icone: '💝', description: 'Faire un premier don', mesure: (e) => [Math.min(dons(e), 1), 1] },
  { id: 'mecene', titre: 'Mécène', icone: '🕊️', description: '50 € donnés à des associations', mesure: (e) => [dons(e), 5000] },
  { id: 'collectionneur', titre: 'Collectionneur', icone: '🎁', description: '3 cartes cadeaux', mesure: (e) => [e.cartes.length, 3] },
];

export function trouverSucces(id: string): Succes | undefined {
  return SUCCES.find((s) => s.id === id);
}

/** Enregistre les succès nouvellement remplis. Renvoie le même objet si rien ne change. */
export function debloquerSucces(etat: Etat, t: number): Etat {
  const nouveaux = SUCCES.filter((s) => !(s.id in etat.succes) && (([fait, objectif]) => fait >= objectif)(s.mesure(etat, t)));
  if (!nouveaux.length) return etat;
  return { ...etat, succes: { ...etat.succes, ...Object.fromEntries(nouveaux.map((s) => [s.id, t])) } };
}
