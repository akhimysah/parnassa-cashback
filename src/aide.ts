// Centre d'aide : questions fréquentes, recherche insensible aux accents, messages au support.

import type { Etat, MessageSupport } from './moteur';

export interface Question {
  q: string;
  r: string;
  theme: 'Cashback' | 'Versements' | 'Offres' | 'Compte';
}

export const FAQ: Question[] = [
  { theme: 'Cashback', q: 'Comment fonctionne le cashback ?', r: "Activez une offre partenaire, puis payez avec votre carte Parnassa. Une partie du montant vous est reversée : d'abord « en attente », puis « disponible » après le délai de rétractation du marchand." },
  { theme: 'Cashback', q: 'Pourquoi mon cashback est-il en attente ?', r: "Le marchand peut encore annuler la commande (retour produit, rétractation). Le délai est indiqué sur sa fiche : de 7 à 60 jours selon le marchand." },
  { theme: 'Cashback', q: 'Mon achat n’apparaît pas, que faire ?', r: 'Signalez-le dans Profil › Cashback manquant dans les 90 jours. Nous vérifions sous 14 jours et créditons le cashback si l’achat n’a pas déjà été compté.' },
  { theme: 'Cashback', q: 'Que se passe-t-il en cas de retour produit ?', r: "Le cashback encore en attente est annulé. Un cashback déjà disponible reste acquis." },
  { theme: 'Cashback', q: 'Les paliers, comment ça marche ?', r: 'Vos dépenses chez les partenaires sur 12 mois glissants déterminent votre palier : Bronze, Argent (500 €), Or (2 000 €), Platine (5 000 €). Le palier multiplie tout votre cashback, jusqu’à ×2.' },
  { theme: 'Offres', q: 'Qu’est-ce qu’un boost ou une offre flash ?', r: "Chaque semaine, deux marchands sont boostés (×1,5). Chaque jour, une offre flash double le taux d'un marchand jusqu'à minuit. Le calendrier des promos les annonce à l'avance." },
  { theme: 'Offres', q: 'Le cashback marche-t-il en magasin ?', r: "Oui, chez les partenaires qui ont des boutiques (onglet Offres › Près de moi), avec un taux propre. Boosts et offres flash ne s'appliquent qu'en ligne." },
  { theme: 'Offres', q: 'Les codes promo sont-ils cumulables ?', r: 'Oui : le code réduit le prix, et le cashback est calculé sur le montant réellement payé.' },
  { theme: 'Versements', q: 'Comment récupérer mon cashback ?', r: 'Depuis l’accueil, « Utiliser mon cashback » : versement sur votre compte Parnassa (dès 10 €), mise de côté dans le coffre, carte cadeau avec bonus ou don à une association.' },
  { theme: 'Versements', q: 'Puis-je verser automatiquement ?', r: 'Oui, dans Profil › Réglages › Versement automatique : tout le disponible part vers le compte ou le coffre dès qu’il atteint votre seuil.' },
  { theme: 'Compte', q: 'Où sont stockées mes données ?', r: 'Dans cette démonstration, uniquement sur votre appareil. Profil › Réglages › Sauvegarder permet de les retrouver ailleurs.' },
  { theme: 'Compte', q: 'Comment parrainer un ami ?', r: 'Partagez votre code depuis Profil › Parrainer. Vous recevez 10 € par ami, disponibles 30 jours après l’ouverture de son compte.' },
];

/** Minuscules sans accents, pour une recherche tolérante. */
export function normaliser(texte: string): string {
  return texte.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
}

/**
 * Questions dont la question ou la réponse contient tous les mots recherchés,
 * les plus pertinentes d'abord (mots présents dans la question elle-même).
 */
export function chercher(recherche: string): Question[] {
  const mots = normaliser(recherche).split(/\s+/).filter((m) => m.length > 1);
  if (!mots.length) return FAQ;
  return FAQ.map((x) => ({ x, q: normaliser(x.q), texte: normaliser(`${x.q} ${x.r}`) }))
    .filter(({ texte }) => mots.every((m) => texte.includes(m)))
    .map(({ x, q }) => ({ x, score: mots.filter((m) => q.includes(m)).length }))
    .sort((a, b) => b.score - a.score)
    .map(({ x }) => x);
}

export function envoyerMessage(etat: Etat, sujet: string, message: string, t: number): Etat {
  const s = sujet.trim();
  const m = message.trim();
  if (s.length < 3) throw new Error('Précisez le sujet');
  if (m.length < 10) throw new Error('Décrivez votre demande en quelques mots');
  const msg: MessageSupport = { id: `s-${t.toString(36)}`, sujet: s.slice(0, 80), message: m.slice(0, 1000), date: t };
  return { ...etat, support: [msg, ...etat.support] };
}
