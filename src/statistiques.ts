import { trouverMarchand, type Categorie } from './marchands';
import { BONUS_PARRAINAGE, type Etat } from './moteur';
import { cleMois, debutMois } from './defis';

export interface GainMois {
  cle: string;
  libelle: string;
  cashback: number;
  bonus: number;
}

const nomMois = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/** Gains des `n` derniers mois (mois courant inclus), du plus ancien au plus récent. Les cashbacks annulés sont exclus. */
export function gainsParMois(etat: Etat, t: number, n = 6): GainMois[] {
  const mois: GainMois[] = [];
  let d = new Date(debutMois(t));
  for (let i = 0; i < n; i++) {
    mois.unshift({ cle: cleMois(d.getTime()), libelle: nomMois.format(d).replace('.', ''), cashback: 0, bonus: 0 });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  const index = new Map(mois.map((m) => [m.cle, m]));
  for (const a of etat.achats) {
    if (a.statut !== 'annule') {
      const m = index.get(cleMois(a.date));
      if (m) m.cashback += a.cashback;
    }
  }
  for (const b of etat.bonus) {
    const m = index.get(cleMois(b.date));
    if (m) m.bonus += b.montant;
  }
  for (const p of etat.parrainages) {
    const m = index.get(cleMois(p.date));
    if (m) m.bonus += BONUS_PARRAINAGE;
  }
  return mois;
}

export function gainsParCategorie(etat: Etat): { categorie: Categorie | 'Hors partenaires'; cashback: number }[] {
  const totaux = new Map<Categorie | 'Hors partenaires', number>();
  for (const a of etat.achats) {
    if (a.statut === 'annule') continue;
    const cat = trouverMarchand(a.marchandId)?.categorie ?? 'Hors partenaires';
    totaux.set(cat, (totaux.get(cat) ?? 0) + a.cashback);
  }
  return [...totaux].map(([categorie, cashback]) => ({ categorie, cashback })).filter((x) => x.cashback > 0).sort((x, y) => y.cashback - x.cashback);
}

/** Total gagné et dépensé chez un marchand donné. */
export function bilanMarchand(etat: Etat, marchandId: string): { achats: number; depense: number; cashback: number } {
  const liste = etat.achats.filter((a) => a.marchandId === marchandId && a.statut !== 'annule');
  return { achats: liste.length, depense: liste.reduce((s, a) => s + a.montant, 0), cashback: liste.reduce((s, a) => s + a.cashback, 0) };
}
