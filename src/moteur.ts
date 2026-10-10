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
export const DELAI_RECLAMATION_JOURS = 14;
/** Une réclamation ne porte que sur un achat des 90 derniers jours. */
export const ANCIENNETE_RECLAMATION_JOURS = 90;

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
  /** Paiement dans une boutique physique (taux « en magasin », sans boost ni flash). Absent = en ligne. */
  canal?: 'magasin';
}

export type Canal = 'en_ligne' | 'magasin';

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

export type Destination = 'compte' | 'coffre' | 'carte' | 'don';

/** Sortie du solde disponible : vers le compte Parnassa, le coffre, une carte cadeau ou un don. */
export interface Versement {
  id: string;
  montant: number;
  date: number;
  destination: Destination;
  /** Pour un don : l'association bénéficiaire. */
  associationId?: string;
}

export interface Mouvement {
  id: string;
  montant: number;
  date: number;
}

export interface Coffre {
  nom: string;
  objectif: number;
  /** Retraits du coffre vers le compte Parnassa (les dépôts sont les versements « coffre »). */
  retraits: Mouvement[];
  /** Arrondis à l'euro supérieur prélevés sur le compte à chaque achat (épargne automatique). */
  arrondis: Mouvement[];
}

export interface CarteCadeau {
  id: string;
  marchandId: string;
  paye: number;
  valeur: number;
  code: string;
  date: number;
  utilisee: boolean;
}

export type StatutReclamation = 'en_etude' | 'acceptee' | 'refusee';

/** Achat chez un partenaire qui n'a pas été crédité (offre oubliée, suivi perdu). */
export interface Reclamation {
  id: string;
  marchandId: string;
  montant: number;
  dateAchat: number;
  date: number;
  decisionLe: number;
  statut: StatutReclamation;
  motif?: string;
}

export type Theme = 'auto' | 'clair' | 'sombre';

export interface Reglages {
  theme: Theme;
  /** Versement automatique dès que le disponible atteint ce seuil (centimes) ; null = désactivé. */
  autoSeuil: number | null;
  autoDestination: 'compte' | 'coffre';
  notifications: boolean;
  /** Arrondit chaque achat à l'euro supérieur et met la différence dans le coffre. */
  arrondi: boolean;
  /** Objectif de cashback par mois (centimes) ; null = pas d'objectif. */
  objectifMensuel: number | null;
}

export interface Etat {
  version: 1;
  codeParrainage: string;
  offresActivees: string[];
  achats: Achat[];
  parrainages: Parrainage[];
  bonus: Bonus[];
  versements: Versement[];
  favoris: string[];
  coffre: Coffre;
  cartes: CarteCadeau[];
  reclamations: Reclamation[];
  reglages: Reglages;
  /** Date du dernier événement vu dans le centre de notifications. */
  notificationsLues: number;
  /** Date du dernier événement signalé par une notification du navigateur. */
  notificationsEnvoyees: number;
  accueilVu: boolean;
  /** Succès débloqués : identifiant → date du déblocage. */
  succes: Record<string, number>;
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

export function genererCode(alea: () => number, prefixe: string, longueur: number): string {
  const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefixe;
  for (let i = 0; i < longueur; i++) code += lettres[Math.floor(alea() * lettres.length)];
  return code;
}

export function etatInitial(alea: () => number = Math.random): Etat {
  return { version: 1, codeParrainage: genererCode(alea, 'PARN-', 6), decalage: 0, ...champsParDefaut(), accueilVu: false };
}

function champsParDefaut() {
  return {
    offresActivees: [] as string[],
    achats: [] as Achat[],
    parrainages: [] as Parrainage[],
    bonus: [] as Bonus[],
    versements: [] as Versement[],
    favoris: [] as string[],
    coffre: { nom: 'Mon coffre', objectif: 20_000, retraits: [], arrondis: [] } as Coffre,
    cartes: [] as CarteCadeau[],
    reclamations: [] as Reclamation[],
    reglages: { theme: 'auto', autoSeuil: null, autoDestination: 'compte', notifications: false, arrondi: false, objectifMensuel: null } as Reglages,
    notificationsLues: 0,
    notificationsEnvoyees: 0,
    succes: {} as Record<string, number>,
  };
}

/** Complète un état enregistré par une version antérieure de l'application. */
export function migrer(brut: unknown): Etat | null {
  const e = brut as Partial<Etat> | null;
  if (!e || e.version !== 1 || typeof e.codeParrainage !== 'string') return null;
  const defaut = champsParDefaut();
  return {
    ...defaut,
    ...e,
    // Les états d'avant l'onboarding ont déjà servi : on ne remontre pas l'accueil.
    accueilVu: e.accueilVu ?? true,
    decalage: e.decalage ?? 0,
    versements: (e.versements ?? []).map((v) => ({ ...v, destination: v.destination ?? 'compte' })),
    coffre: { ...defaut.coffre, ...e.coffre },
    reglages: { ...defaut.reglages, ...e.reglages },
    succes: { ...e.succes },
  } as Etat;
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

/** Générateur congruentiel sur 31 bits, en arithmétique entière exacte (Math.imul). */
export function aleaSuivant(graine: number): number {
  return (Math.imul(graine, 1103515245) + 12345) & 0x7fffffff;
}

/** Indice dans [0, n) tiré des bits de poids fort (les bits faibles d'un générateur congruentiel varient peu). */
export function indiceAlea(graine: number, n: number): number {
  return Math.floor((graine / 0x80000000) * n);
}

/**
 * Graine entière à partir d'un nombre quelconque (numéro de semaine, de jour…).
 * Brassage « fmix32 » (finalisation de MurmurHash3) : deux entrées voisines donnent des graines sans lien.
 */
export function graineDe(n: number): number {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h & 0x7fffffff;
}
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
  let graine = graineDe(numeroSemaine(t));
  const restants = MARCHANDS.map((m) => m.id);
  const choisis: string[] = [];
  while (choisis.length < BOOSTS_PAR_SEMAINE && restants.length) {
    graine = aleaSuivant(graine);
    choisis.push(restants.splice(indiceAlea(graine, restants.length), 1)[0]);
  }
  return choisis;
}

export const COEF_FLASH = 2;
/** Le taux d'une offre flash ne dépasse jamais ce plafond (en %). */
export const TAUX_FLASH_MAX = 20;

/** Minuit (heure locale) du jour de `t`. */
export function debutJour(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function finJour(t: number): number {
  const d = new Date(debutJour(t));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** Offre flash du jour : un marchand non boosté cette semaine, cashback doublé jusqu'à minuit. */
export function offreFlash(t: number): { marchandId: string; taux: number; fin: number } {
  const d = new Date(t);
  const graine = aleaSuivant(graineDe(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()));
  const boosts = boostsDeLaSemaine(t);
  const candidats = MARCHANDS.filter((m) => !boosts.includes(m.id));
  const m = candidats[indiceAlea(graine, candidats.length)];
  return { marchandId: m.id, taux: Math.min(m.taux * COEF_FLASH, Math.max(m.taux, TAUX_FLASH_MAX)), fin: finJour(t) };
}

/** Taux partenaire (en %) avant palier, boost ou offre flash compris. */
export function tauxMarchand(marchandId: string, t: number): number {
  const marchand = trouverMarchand(marchandId);
  if (!marchand) return TAUX_BASE;
  const flash = offreFlash(t);
  if (flash.marchandId === marchand.id) return flash.taux;
  return boostsDeLaSemaine(t).includes(marchand.id) ? marchand.taux * COEF_BOOST : marchand.taux;
}

/** Taux effectif (en %) après boost et multiplicateur de palier. */
export function tauxEffectif(etat: Etat, marchandId: string | null, t: number): number {
  const { multiplicateur } = palierActuel(etat, t).palier;
  const marchand = trouverMarchand(marchandId);
  if (!marchand || !etat.offresActivees.includes(marchand.id)) return TAUX_BASE * multiplicateur;
  return tauxMarchand(marchand.id, t) * multiplicateur;
}

/** Taux en boutique physique (en %), palier compris ; null si le marchand n'a pas de magasin. */
export function tauxEnMagasin(etat: Etat, marchandId: string, t: number): number | null {
  const marchand = trouverMarchand(marchandId);
  if (!marchand?.enMagasin) return null;
  const { multiplicateur } = palierActuel(etat, t).palier;
  return etat.offresActivees.includes(marchand.id) ? marchand.enMagasin * multiplicateur : TAUX_BASE * multiplicateur;
}

export function calculerCashback(etat: Etat, marchandId: string | null, montant: number, t: number, canal: Canal = 'en_ligne'): number {
  if (!Number.isFinite(montant) || montant <= 0) return 0;
  const marchand = trouverMarchand(marchandId);
  const taux = canal === 'magasin' && marchandId ? tauxEnMagasin(etat, marchandId, t) : tauxEffectif(etat, marchandId, t);
  if (taux === null) throw new Error("Ce marchand n'a pas de magasin");
  const brut = Math.floor((montant * taux) / 100);
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

export function enregistrerAchat(etat: Etat, marchandId: string | null, montant: number, t: number, libelle?: string, canal: Canal = 'en_ligne'): Etat {
  if (!Number.isInteger(montant) || montant <= 0) throw new Error('Montant invalide');
  const marchand = trouverMarchand(marchandId);
  const actif = marchand && etat.offresActivees.includes(marchand.id);
  const delai = actif ? marchand.delaiJours : DELAI_BASE_JOURS;
  const achat: Achat = {
    id: nouvelId('a', t),
    marchandId: actif ? marchand.id : null,
    libelle: libelle ?? marchand?.nom ?? 'Paiement par carte',
    montant,
    cashback: calculerCashback(etat, marchandId, montant, t, canal),
    date: t,
    disponibleLe: t + delai * JOUR,
    statut: 'en_attente',
    ...(canal === 'magasin' ? { canal } : {}),
  };
  const arrondi = etat.reglages.arrondi ? arrondiDe(montant) : 0;
  const coffre = arrondi ? { ...etat.coffre, arrondis: [{ id: `${achat.id}-arrondi`, montant: arrondi, date: t }, ...etat.coffre.arrondis] } : etat.coffre;
  return { ...etat, achats: [achat, ...etat.achats], coffre };
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

export function declarerReclamation(etat: Etat, marchandId: string, montant: number, dateAchat: number, t: number): Etat {
  if (!trouverMarchand(marchandId)) throw new Error('Marchand inconnu');
  if (!Number.isInteger(montant) || montant <= 0) throw new Error('Montant invalide');
  if (dateAchat > t) throw new Error("La date d'achat est dans le futur");
  if (dateAchat < t - ANCIENNETE_RECLAMATION_JOURS * JOUR) throw new Error(`Achat de plus de ${ANCIENNETE_RECLAMATION_JOURS} jours`);
  const enDouble = etat.reclamations.some(
    (r) => r.statut !== 'refusee' && r.marchandId === marchandId && r.montant === montant && Math.abs(r.dateAchat - dateAchat) < 2 * JOUR,
  );
  if (enDouble) throw new Error('Une réclamation existe déjà pour cet achat');
  const r: Reclamation = {
    id: nouvelId('r', t),
    marchandId,
    montant,
    dateAchat,
    date: t,
    decisionLe: t + DELAI_RECLAMATION_JOURS * JOUR,
    statut: 'en_etude',
  };
  return { ...etat, reclamations: [r, ...etat.reclamations] };
}

/** Décision sur une réclamation : refusée si un achat identique a déjà été crédité, sinon créditée au taux du marchand. */
function deciderReclamation(etat: Etat, r: Reclamation): { reclamation: Reclamation; achat?: Achat } {
  const doublon = etat.achats.some(
    (a) => a.statut !== 'annule' && a.marchandId === r.marchandId && a.montant === r.montant && Math.abs(a.date - r.dateAchat) < 2 * JOUR,
  );
  if (doublon) return { reclamation: { ...r, statut: 'refusee', motif: 'Cet achat a déjà été crédité.' } };
  const marchand = trouverMarchand(r.marchandId)!;
  const brut = Math.floor((r.montant * marchand.taux) / 100);
  const cashback = marchand.plafond !== undefined ? Math.min(brut, marchand.plafond) : brut;
  const achat: Achat = {
    id: `${r.id}-achat`,
    marchandId: r.marchandId,
    libelle: `${marchand.nom} (réclamation)`,
    montant: r.montant,
    cashback,
    date: r.dateAchat,
    disponibleLe: r.decisionLe,
    statut: 'disponible',
  };
  return { reclamation: { ...r, statut: 'acceptee' }, achat };
}

/** Fait passer en « disponible » tout ce dont le délai est écoulé et tranche les réclamations. Renvoie le même objet si rien ne change. */
export function actualiser(etat: Etat, t: number): Etat {
  const mur = <T extends { statut: Statut; disponibleLe: number }>(x: T): T =>
    x.statut === 'en_attente' && x.disponibleLe <= t ? { ...x, statut: 'disponible' } : x;
  let achats = etat.achats.map(mur);
  const parrainages = etat.parrainages.map(mur);
  let change = achats.some((a, i) => a !== etat.achats[i]) || parrainages.some((p, i) => p !== etat.parrainages[i]);
  let reclamations = etat.reclamations;
  if (reclamations.some((r) => r.statut === 'en_etude' && r.decisionLe <= t)) {
    change = true;
    // Les plus anciennes d'abord, pour qu'un doublon entre deux réclamations soit détecté.
    const ordre = [...reclamations].sort((a, b) => a.date - b.date);
    const decisions = new Map<string, Reclamation>();
    for (const r of ordre) {
      if (r.statut !== 'en_etude' || r.decisionLe > t) continue;
      const { reclamation, achat } = deciderReclamation({ ...etat, achats }, r);
      decisions.set(r.id, reclamation);
      if (achat) achats = [achat, ...achats].sort((a, b) => b.date - a.date);
    }
    reclamations = reclamations.map((r) => decisions.get(r.id) ?? r);
  }
  return change ? { ...etat, achats, parrainages, reclamations } : etat;
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
  // « verse » regroupe tout ce qui est sorti du disponible : compte, coffre et cartes cadeaux.
  const acquis = somme('disponible') + etat.bonus.reduce((s, b) => s + b.montant, 0);
  return { enAttente: somme('en_attente'), disponible: acquis - verse, verse, totalGagne: acquis };
}

/**
 * Sort du solde disponible (tout, par défaut). Le compte Parnassa exige un minimum ;
 * le coffre et les cartes cadeaux acceptent n'importe quel montant couvert par le solde.
 */
export function verser(etat: Etat, t: number, destination: Destination = 'compte', montant?: number): Etat {
  const { disponible } = soldes(etat);
  const somme = montant ?? disponible;
  if (!Number.isInteger(somme) || somme <= 0) throw new Error('Rien à verser');
  if (somme > disponible) throw new Error('Solde disponible insuffisant');
  if (destination === 'compte' && somme < VERSEMENT_MINIMUM) throw new Error(`Minimum de versement : ${formatEuros(VERSEMENT_MINIMUM)}`);
  return { ...etat, versements: [{ id: nouvelId('v', t), montant: somme, date: t, destination }, ...etat.versements] };
}

export function soldeCoffre(etat: Etat): number {
  const depots = etat.versements.filter((v) => v.destination === 'coffre').reduce((s, v) => s + v.montant, 0);
  const arrondis = etat.coffre.arrondis.reduce((s, a) => s + a.montant, 0);
  return depots + arrondis - etat.coffre.retraits.reduce((s, r) => s + r.montant, 0);
}

/** Différence jusqu'à l'euro supérieur (0 si le montant est rond). */
export function arrondiDe(montant: number): number {
  return (100 - (montant % 100)) % 100;
}

/** Don à une association, prélevé sur le cashback disponible (n'importe quel montant couvert par le solde). */
export function donner(etat: Etat, associationId: string, montant: number, t: number): Etat {
  const apres = verser(etat, t, 'don', montant);
  const [don, ...reste] = apres.versements;
  return { ...apres, versements: [{ ...don, associationId }, ...reste] };
}

/** Retire du coffre vers le compte Parnassa (tout, par défaut). */
export function retirerCoffre(etat: Etat, t: number, montant?: number): Etat {
  const solde = soldeCoffre(etat);
  const somme = montant ?? solde;
  if (!Number.isInteger(somme) || somme <= 0) throw new Error('Coffre vide');
  if (somme > solde) throw new Error('Le coffre ne contient pas assez');
  return { ...etat, coffre: { ...etat.coffre, retraits: [{ id: nouvelId('c', t), montant: somme, date: t }, ...etat.coffre.retraits] } };
}

export function reglerCoffre(etat: Etat, nom: string, objectif: number): Etat {
  const propre = nom.trim().slice(0, 40);
  if (!propre) throw new Error('Nom du coffre requis');
  if (!Number.isInteger(objectif) || objectif <= 0) throw new Error('Objectif invalide');
  return { ...etat, coffre: { ...etat.coffre, nom: propre, objectif } };
}

export function basculerFavori(etat: Etat, marchandId: string): Etat {
  const favoris = etat.favoris.includes(marchandId) ? etat.favoris.filter((id) => id !== marchandId) : [...etat.favoris, marchandId];
  return { ...etat, favoris };
}

export function regler(etat: Etat, changement: Partial<Reglages>): Etat {
  const reglages = { ...etat.reglages, ...changement };
  if (reglages.autoSeuil !== null && (!Number.isInteger(reglages.autoSeuil) || reglages.autoSeuil < VERSEMENT_MINIMUM)) {
    throw new Error(`Seuil minimum : ${formatEuros(VERSEMENT_MINIMUM)}`);
  }
  if (reglages.objectifMensuel !== null && (!Number.isInteger(reglages.objectifMensuel) || reglages.objectifMensuel <= 0)) {
    throw new Error('Objectif invalide');
  }
  return { ...etat, reglages };
}

/** Versement automatique : tout le disponible part dès que le seuil est atteint. */
export function appliquerAutomatismes(etat: Etat, t: number): Etat {
  const { autoSeuil, autoDestination } = etat.reglages;
  if (autoSeuil === null) return etat;
  const { disponible } = soldes(etat);
  return disponible >= autoSeuil ? verser(etat, t, autoDestination) : etat;
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
