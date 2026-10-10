import { trouverMarchand } from './marchands';
import type { Etat } from './moteur';

const STATUTS = { en_attente: 'En attente', disponible: 'Disponible', annule: 'Annulé' } as const;
const DESTINATIONS = { compte: 'Versement compte Parnassa', coffre: 'Mise en coffre', carte: 'Carte cadeau' } as const;

function cellule(v: string | number): string {
  const texte = String(v);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

function euros(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',');
}

function jour(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Historique complet au format CSV « à la française » (séparateur ;, virgule décimale) pour Excel. */
export function historiqueCsv(etat: Etat): string {
  const lignes: (string | number)[][] = [['Date', 'Type', 'Libellé', 'Catégorie', 'Montant achat (€)', 'Cashback (€)', 'Statut']];
  const corps: { date: number; ligne: (string | number)[] }[] = [];
  for (const a of etat.achats) {
    corps.push({ date: a.date, ligne: [jour(a.date), 'Achat', a.libelle, trouverMarchand(a.marchandId)?.categorie ?? 'Hors partenaires', euros(a.montant), euros(a.cashback), STATUTS[a.statut]] });
  }
  for (const b of etat.bonus) corps.push({ date: b.date, ligne: [jour(b.date), 'Bonus', b.libelle, '', '', euros(b.montant), 'Disponible'] });
  for (const p of etat.parrainages) corps.push({ date: p.date, ligne: [jour(p.date), 'Parrainage', p.prenom, '', '', '10,00', STATUTS[p.statut]] });
  for (const v of etat.versements) corps.push({ date: v.date, ligne: [jour(v.date), 'Sortie', DESTINATIONS[v.destination], '', '', `-${euros(v.montant)}`, 'Effectué'] });
  corps.sort((x, y) => y.date - x.date);
  lignes.push(...corps.map((c) => c.ligne));
  return '﻿' + lignes.map((l) => l.map(cellule).join(';')).join('\r\n');
}

export function telecharger(nom: string, contenu: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
