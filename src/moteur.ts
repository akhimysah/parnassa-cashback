// Moteur du cashback : calcul, validation dans le temps, paliers, parrainage et versements.
// Fonctions pures sur un état sérialisable ; tous les montants sont en centimes.

import { MARCHANDS, trouverMarchand } from './marchands';

export const JOUR = 86_400_000;
/** Cashback de base sur les paiements par carte hors partenaires. */
export const TAUX_BASE = 0.5;
export const DELAI_BASE_JOURS = 30;
export const VERSEMENT_MINIMUM = 1000;
export const BONUS_PARRAINAGE = 1000;
export const DELAI_PARRAINAGE_JOURS = 30;

export type Statut = 'en_attente' | 'disponible' | 'annule';

export interface Achat {
  id: string;
  /** null = paiement par carte hors partenaire (taux de base). */
  marchandId: string | null;
  libelle: string;
  montant: number;
  cashback: number;
  date: number;
  disponibleLe: number;
  statut: Statut;
}

export interface Parrainage {
  id: string;
  prenom: string;
  date: number;
  disponibleLe: number;
  statut: Statut;
}

/** Récompense ponctuelle (défi du mois réussi). */
export interface Bonus {
  id: string;
  /** Identifiant unique de ce qui a été récompensé, ex. « 2026-10:gourmand ». */
  cle: string;
  libelle: string;
  montant: number;
  date: number;
}

export interface Versement {
  id: string;
  montant: number;
  date: number;
}

export interface Etat {
  version: 1;
  codeParrainage: string;
  offresActivees: string[];
  achats: Achat[];
  parrainages: Parrainage[];
  bonus: Bonus[];
  versements: Versement[];
  /** Décalage de l'horloge pour la démonstration (« avancer le temps »). */
  decalage: number;
}

export interface Palier {
  nom: 'Bronze' | 'Argent' | 'Or' | 'Platine';
  /** Dépenses minimales sur 12 mois glissants, en centimes. */
  seuil: number;
  multiplicateur: number;
}

export const PALIERS: Palier[] = [
  { nom: 'Bronze', seuil: 0, multiplicateur: 1 },
  { nom: 'Argent', seuil: 50_000, multiplicateur: 1.2 },
  { nom: 'Or', seuil: 200_000, multiplicateur: 1.5 },
  { nom: 'Platine', seuil: 500_000, multiplicateur: 2 },
];

export function etatInitial(alea: () => number = Math.random): Etat {
  const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PARN-';
  for (let i = 0; i < 6; i++) code += lettres[Math.floor(alea() * lettres.length)];
  return { version: 1, codeParrainage: code, offresActivees: [], achats: [], parrainages: [], bonus: [], versements: [], decalage: 0 };
}

export function maintenant(etat: Etat, horloge = Date.now()): number {
  return horloge + etat.decalage;
}

export function depenses12Mois(etat: Etat, t: number): number {
  return etat.achats
    .filter((a) => a.statut !== 'annule' && a.date > t - 365 * JOUR)
    .reduce((s, a) => s + a.montant, 0);
}

export function palierActuel(etat: Etat, t: number): { palier: Palier; suivant?: Palier; progression: number } {
  const depenses = depenses12Mois(etat, t);
  let i = 0;
  while (i + 1 < PALIERS.length && depenses >= PALIERS[i + 1].seuil) i++;
  const palier = PALIERS[i];
  const suivant = PALIERS[i + 1];
  const progression = suivant ? (depenses - palier.seuil) / (suivant.seuil - palier.seuil) : 1;
  return { palier, suivant, progression };
}

export const SEMAINE = 7 * JOUR;
export const COEF_BOOST = 1.5;
export const BOOSTS_PAR_SEMAINE = 2;

/** Lundi 0 h (heure locale) de la semaine qui suit celle de `t` : fin des boosts en cours. */
export function finDeSemaine(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return d.getTime();
}

/** Numéro de semaine (semaines du lundi au dimanche, heure locale). */
export function numeroSemaine(t: number): number {
  return Math.round((finDeSemaine(t) - 4 * JOUR) / SEMAINE);
}

/** Marchands boostés cette semaine : tirage déterministe, identique pour tout le monde. */
export function boostsDeLaSemaine(t: number): string[] {
  let graine = numeroSemaine(t) * 2654435761;
  const restants = MARCHANDS.map((m) => m.id);
  const choisis: string[] = [];
  while (choisis.length < BOOSTS_PAR_SEMAINE && restants.length) {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    choisis.push(restants.splice(graine % restants.length, 1)[0]);
  }
  return choisis;
}

/** Taux partenaire (en %) avant palier, boost compris. */
export function tauxMarchand(marchandId: string, t: number): number {
  const marchand = trouverMarchand(marchandId);
  if (!marchand) return TAUX_BASE;
  return boostsDeLaSemaine(t).includes(marchand.id) ? marchand.taux * COEF_BOOST : marchand.taux;
}

/** Taux effectif (en %) après boost et multiplicateur de palier. */
export function tauxEffectif(etat: Etat, marchandId: string | null, t: number): number {
  const { multiplicateur } = palierActuel(etat, t).palier;
  const marchand = trouverMarchand(marchandId);
  if (!marchand || !etat.offresActivees.includes(marchand.id)) return TAUX_BASE * multiplicateur;
  return tauxMarchand(marchand.id, t) * multiplicateur;
}

export function calculerCashback(etat: Etat, marchandId: string | null, montant: number, t: number): number {
  if (!Number.isFinite(montant) || montant <= 0) return 0;
  const marchand = trouverMarchand(marchandId);
  const brut = Math.floor((montant * tauxEffectif(etat, marchandId, t)) / 100);
  const actif = marchand && etat.offresActivees.includes(marchand.id);
  return actif && marchand.plafond !== undefined ? Math.min(brut, marchand.plafond) : brut;
}

let compteur = 0;
function nouvelId(prefixe: string, t: number): string {
  compteur = (compteur + 1) % 1_000_000;
  return `${prefixe}-${t.toString(36)}-${compteur.toString(36)}`;
}

export function basculerOffre(etat: Etat, marchandId: string): Etat {
  const actives = etat.offresActivees.includes(marchandId)
    ? etat.offresActivees.filter((id) => id !== marchandId)
    : [...etat.offresActivees, marchandId];
  return { ...etat, offresActivees: actives };
}

export function enregistrerAchat(etat: Etat, marchandId: string | null, montant: number, t: number, libelle?: string): Etat {
  if (!Number.isInteger(montant) || montant <= 0) throw new Error('Montant invalide');
  const marchand = trouverMarchand(marchandId);
  const actif = marchand && etat.offresActivees.includes(marchand.id);
  const delai = actif ? marchand.delaiJours : DELAI_BASE_JOURS;
  const achat: Achat = {
    id: nouvelId('a', t),
    marchandId: actif ? marchand.id : null,
    libelle: libelle ?? marchand?.nom ?? 'Paiement par carte',
    montant,
    cashback: calculerCashback(etat, marchandId, montant, t),
    date: t,
    disponibleLe: t + delai * JOUR,
    statut: 'en_attente',
  };
  return { ...etat, achats: [achat, ...etat.achats] };
}

/** Retour produit : le cashback encore en attente est annulé. */
export function annulerAchat(etat: Etat, achatId: string): Etat {
  return {
    ...etat,
    achats: etat.achats.map((a) => (a.id === achatId && a.statut === 'en_attente' ? { ...a, statut: 'annule' } : a)),
  };
}

export function ajouterParrainage(etat: Etat, prenom: string, t: number): Etat {
  const nom = prenom.trim();
  if (!nom) throw new Error('Prénom requis');
  const p: Parrainage = { id: nouvelId('p', t), prenom: nom, date: t, disponibleLe: t + DELAI_PARRAINAGE_JOURS * JOUR, statut: 'en_attente' };
  return { ...etat, parrainages: [p, ...etat.parrainages] };
}

/** Fait passer en « disponible » tout ce dont le délai est écoulé. Renvoie le même objet si rien ne change. */
export function actualiser(etat: Etat, t: number): Etat {
  const mur = <T extends { statut: Statut; disponibleLe: number }>(x: T): T =>
    x.statut === 'en_attente' && x.disponibleLe <= t ? { ...x, statut: 'disponible' } : x;
  const achats = etat.achats.map(mur);
  const parrainages = etat.parrainages.map(mur);
  const change = achats.some((a, i) => a !== etat.achats[i]) || parrainages.some((p, i) => p !== etat.parrainages[i]);
  return change ? { ...etat, achats, parrainages } : etat;
}

export interface Soldes {
  enAttente: number;
  disponible: number;
  verse: number;
  totalGagne: number;
}

export function soldes(etat: Etat): Soldes {
  const somme = (statut: Statut) =>
    etat.achats.filter((a) => a.statut === statut).reduce((s, a) => s + a.cashback, 0) +
    etat.parrainages.filter((p) => p.statut === statut).length * BONUS_PARRAINAGE;
  const verse = etat.versements.reduce((s, v) => s + v.montant, 0);
  const acquis = somme('disponible') + etat.bonus.reduce((s, b) => s + b.montant, 0);
  return { enAttente: somme('en_attente'), disponible: acquis - verse, verse, totalGagne: acquis };
}

/** Verse tout le solde disponible sur le compte Parnassa. */
export function verser(etat: Etat, t: number): Etat {
  const { disponible } = soldes(etat);
  if (disponible < VERSEMENT_MINIMUM) throw new Error(`Minimum de versement : ${formatEuros(VERSEMENT_MINIMUM)}`);
  return { ...etat, versements: [{ id: nouvelId('v', t), montant: disponible, date: t }, ...etat.versements] };
}

/** Ajoute un bonus, une seule fois par clé. */
export function crediterBonus(etat: Etat, cle: string, libelle: string, montant: number, t: number): Etat {
  if (etat.bonus.some((b) => b.cle === cle)) throw new Error('Récompense déjà obtenue');
  return { ...etat, bonus: [{ id: nouvelId('b', t), cle, libelle, montant, date: t }, ...etat.bonus] };
}

export function avancerTemps(etat: Etat, jours: number): Etat {
  return { ...etat, decalage: etat.decalage + jours * JOUR };
}

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export function formatEuros(centimes: number): string {
  return euros.format(centimes / 100);
}

export function formatTaux(taux: number): string {
  return `${Number(taux.toFixed(2)).toLocaleString('fr-FR')} %`;
}

/** « 12,50 » ou « 12.5 » → 1250 ; null si la saisie n'est pas un montant. */
export function lireMontant(saisie: string): number | null {
  const propre = saisie.replace(/\s|€/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(propre)) return null;
  const c = Math.round(Number(propre) * 100);
  return c > 0 ? c : null;
}
