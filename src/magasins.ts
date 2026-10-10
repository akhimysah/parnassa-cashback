// Magasins partenaires autour d'une position (démonstration : ils sont générés autour de l'utilisateur).

import { MARCHANDS, type Marchand } from './marchands';
import { aleaSuivant, graineDe, indiceAlea } from './moteur';

export interface Position {
  lat: number;
  lng: number;
}

export interface Magasin {
  id: string;
  marchand: Marchand;
  adresse: string;
  position: Position;
}

/** Châtelet, Paris : position par défaut si la géolocalisation est refusée. */
export const PARIS: Position = { lat: 48.8584, lng: 2.3470 };

const RUES = [
  'rue de la République', 'avenue Victor-Hugo', 'rue du Marché', 'boulevard Gambetta', 'rue des Lilas', 'place de la Mairie',
  'rue Pasteur', 'avenue Jean-Jaurès', 'rue de la Gare', 'cours Mirabeau', 'rue Saint-Michel', 'quai des Arts',
];

/** Distance à vol d'oiseau en kilomètres (formule de haversine). */
export function distanceKm(a: Position, b: Position): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Deux magasins par marchand physique, dans un rayon d'environ 3 km.
 * La position est arrondie au kilomètre : les magasins restent fixes quand on bouge un peu.
 */
export function magasinsAutour(centre: Position): Magasin[] {
  const grille = { lat: Math.round(centre.lat * 100) / 100, lng: Math.round(centre.lng * 100) / 100 };
  const base = Math.round(grille.lat * 100) * 100_003 + Math.round(grille.lng * 100);
  const magasins: Magasin[] = [];
  MARCHANDS.filter((m) => m.enMagasin).forEach((m, i) => {
    let graine = graineDe(base + i * 7919);
    for (let k = 0; k < 2; k++) {
      graine = aleaSuivant(graine);
      const angle = (graine / 0x80000000) * 2 * Math.PI;
      graine = aleaSuivant(graine);
      const rayonKm = 0.25 + (graine / 0x80000000) * 2.75;
      graine = aleaSuivant(graine);
      const position = {
        lat: grille.lat + (rayonKm / 111.32) * Math.sin(angle),
        lng: grille.lng + (rayonKm / (111.32 * Math.cos((grille.lat * Math.PI) / 180))) * Math.cos(angle),
      };
      magasins.push({ id: `${m.id}-${k}`, marchand: m, adresse: `${1 + indiceAlea(graine, 120)} ${RUES[indiceAlea(aleaSuivant(graine), RUES.length)]}`, position });
    }
  });
  return magasins;
}

export function magasinsProches(centre: Position): (Magasin & { distance: number })[] {
  return magasinsAutour(centre)
    .map((m) => ({ ...m, distance: distanceKm(centre, m.position) }))
    .sort((a, b) => a.distance - b.distance);
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace('.', ',')} km`;
}
