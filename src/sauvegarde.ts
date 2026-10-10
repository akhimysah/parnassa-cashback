// Sauvegarde et restauration de toutes les données dans un fichier JSON.

import { migrer, type Etat } from './moteur';

export const FORMAT = 'parnassa-cashback';

export function exporterSauvegarde(etat: Etat, t: number): string {
  return JSON.stringify({ format: FORMAT, exporteLe: new Date(t).toISOString(), etat }, null, 2);
}

/** Lit une sauvegarde ; lève une erreur lisible si le fichier ne convient pas. */
export function lireSauvegarde(texte: string): Etat {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde lisible");
  }
  const enveloppe = brut as { format?: string; etat?: unknown };
  if (enveloppe?.format !== FORMAT) throw new Error("Ce fichier n'est pas une sauvegarde Parnassa Cashback");
  const etat = migrer(enveloppe.etat);
  if (!etat || !Array.isArray(etat.achats) || !Array.isArray(etat.versements)) throw new Error('Sauvegarde incomplète ou endommagée');
  return { ...etat, accueilVu: true };
}
