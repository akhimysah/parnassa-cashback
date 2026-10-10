// Récap mensuel : le mois en chiffres, comparé au mois précédent.

import { CATEGORIES, trouverMarchand, type Categorie } from './marchands';
import { BONUS_PARRAINAGE, type Etat } from './moteur';
import { cleMois } from './defis';
import { SUCCES } from './succes';

export interface Recap {
  cle: string;
  libelle: string;
  gagne: number;
  depense: number;
  achats: number;
  marchands: number;
  tauxMoyen: number;
  meilleurMarchand: { nom: string; cashback: number } | null;
  categorieTop: Categorie | null;
  /** Variation des gains par rapport au mois précédent, en % ; null si le mois précédent est vide. */
  evolution: number | null;
  defis: number;
  succes: string[];
}

const nomMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function moisPrecedent(cle: string): string {
  const [a, m] = cle.split('-').map(Number);
  return cleMois(new Date(a, m - 2, 15).getTime());
}

function gainsDu(etat: Etat, cle: string): number {
  return (
    etat.achats.filter((a) => a.statut !== 'annule' && cleMois(a.date) === cle).reduce((s, a) => s + a.cashback, 0) +
    etat.bonus.filter((b) => cleMois(b.date) === cle).reduce((s, b) => s + b.montant, 0) +
    etat.parrainages.filter((p) => cleMois(p.date) === cle).length * BONUS_PARRAINAGE
  );
}

/** Mois qui ont de l'activité, du plus récent au plus ancien. */
export function moisActifs(etat: Etat): string[] {
  const cles = new Set([...etat.achats.map((a) => a.date), ...etat.bonus.map((b) => b.date), ...etat.parrainages.map((p) => p.date)].map(cleMois));
  return [...cles].sort().reverse();
}

export function recapMois(etat: Etat, cle: string): Recap {
  const [a, m] = cle.split('-').map(Number);
  const achats = etat.achats.filter((x) => x.statut !== 'annule' && cleMois(x.date) === cle);
  const depense = achats.reduce((s, x) => s + x.montant, 0);
  const cashbackAchats = achats.reduce((s, x) => s + x.cashback, 0);

  const parMarchand = new Map<string, number>();
  const parCategorie = new Map<Categorie, number>();
  for (const x of achats) {
    const marchand = trouverMarchand(x.marchandId);
    if (!marchand) continue;
    parMarchand.set(marchand.nom, (parMarchand.get(marchand.nom) ?? 0) + x.cashback);
    parCategorie.set(marchand.categorie, (parCategorie.get(marchand.categorie) ?? 0) + x.cashback);
  }
  const meilleur = [...parMarchand].sort((x, y) => y[1] - x[1])[0];
  const categorieTop = [...parCategorie].sort((x, y) => y[1] - x[1] || CATEGORIES.indexOf(x[0]) - CATEGORIES.indexOf(y[0]))[0]?.[0] ?? null;

  const gagne = gainsDu(etat, cle);
  const avant = gainsDu(etat, moisPrecedent(cle));
  return {
    cle,
    libelle: nomMois.format(new Date(a, m - 1, 15)),
    gagne,
    depense,
    achats: achats.length,
    marchands: parMarchand.size,
    tauxMoyen: depense ? (cashbackAchats / depense) * 100 : 0,
    meilleurMarchand: meilleur ? { nom: meilleur[0], cashback: meilleur[1] } : null,
    categorieTop,
    evolution: avant ? Math.round(((gagne - avant) / avant) * 100) : null,
    defis: etat.bonus.filter((b) => b.cle.startsWith(`${cle}:`)).length,
    succes: Object.entries(etat.succes).filter(([, d]) => cleMois(d) === cle).map(([id]) => SUCCES.find((s) => s.id === id)?.titre ?? id),
  };
}
