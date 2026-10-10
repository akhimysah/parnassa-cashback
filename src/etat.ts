import { etatInitial, migrer, type Etat } from './moteur';

const CLE = 'parnassa-cashback:v1';

export function charger(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    const e = brut ? migrer(JSON.parse(brut)) : null;
    if (e) return e;
  } catch {
    // Stockage indisponible (navigation privée) : on repart d'un état neuf.
  }
  return etatInitial();
}

export function sauver(etat: Etat): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // Rien à faire : l'état reste en mémoire pour la session.
  }
}
