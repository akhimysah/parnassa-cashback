// Centre de notifications : les événements sont déduits de l'état, rien n'est stocké en double.

import { avancement, defisDuMois } from './defis';
import { trouverMarchand } from './marchands';
import type { SousProfil } from './App';
import { BONUS_PARRAINAGE, boostsDeLaSemaine, debutJour, offreFlash, finDeSemaine, formatEuros, formatTaux, palierActuel, SEMAINE, tauxMarchand, type Etat } from './moteur';
import { serie } from './serie';
import { trouverSucces } from './succes';
import { alertesDeclenchees } from './alertes';
import { moisActifs } from './recap';
import { cleMois, debutMois } from './defis';

export interface Evenement {
  id: string;
  date: number;
  icone: string;
  titre: string;
  texte: string;
  /** Onglet à ouvrir quand on touche l'événement (« recap » ouvre le récap du mois précédent). */
  cible: 'accueil' | 'offres' | 'defis' | 'activite' | 'profil' | 'recap';
  sous?: SousProfil;
}

/** « de Miam Express », « d’Éclat Beauté ». */
export function de(nom: string): string {
  return /^[aeiouyàâéèêëîïôöûü]/i.test(nom) ? `d’${nom}` : `de ${nom}`;
}

export function evenements(etat: Etat, t: number): Evenement[] {
  const liste: Evenement[] = [];

  for (const a of etat.achats) {
    if (a.statut === 'disponible' && a.disponibleLe <= t && !a.id.endsWith('-achat')) {
      liste.push({ id: `dispo:${a.id}`, date: a.disponibleLe, icone: '✅', titre: 'Cashback disponible', texte: `${formatEuros(a.cashback)} ${de(a.libelle)} peuvent être versés.`, cible: 'accueil' });
    }
  }
  for (const p of etat.parrainages) {
    if (p.statut === 'disponible') {
      liste.push({ id: `parrain:${p.id}`, date: p.disponibleLe, icone: '💜', titre: 'Bonus de parrainage', texte: `${formatEuros(BONUS_PARRAINAGE)} grâce à ${p.prenom}.`, cible: 'accueil' });
    }
  }
  for (const r of etat.reclamations) {
    if (r.statut === 'en_etude' || r.decisionLe > t) continue;
    const nom = trouverMarchand(r.marchandId)?.nom ?? 'Marchand';
    liste.push(
      r.statut === 'acceptee'
        ? { id: `recl:${r.id}`, date: r.decisionLe, icone: '📨', titre: 'Réclamation acceptée', texte: `Votre achat chez ${nom} a été crédité.`, cible: 'activite' }
        : { id: `recl:${r.id}`, date: r.decisionLe, icone: '📨', titre: 'Réclamation refusée', texte: `${nom} : ${r.motif ?? 'achat non retrouvé.'}`, cible: 'profil', sous: 'reclamations' },
    );
  }

  for (const [id, date] of Object.entries(etat.succes)) {
    const s = trouverSucces(id);
    if (s) liste.push({ id: `succes:${id}`, date, icone: s.icone, titre: `Succès débloqué : ${s.titre}`, texte: s.description, cible: 'defis' });
  }

  // Le 1er du mois, le récap du mois écoulé s'il a eu de l'activité.
  const debut = debutMois(t);
  const precedent = cleMois(debut - 1);
  if (moisActifs(etat).includes(precedent)) {
    liste.push({ id: `recap:${precedent}`, date: debut, icone: '📊', titre: 'Votre récap est prêt', texte: 'Découvrez votre mois en chiffres.', cible: 'recap' });
  }

  // Offre flash du jour, annoncée à minuit.
  const flash = offreFlash(t);
  liste.push({ id: `flash:${flash.fin}`, date: debutJour(t), icone: '⏱️', titre: 'Offre flash du jour', texte: `${trouverMarchand(flash.marchandId)?.nom} : ${formatTaux(flash.taux * palierActuel(etat, t).palier.multiplicateur)} jusqu'à minuit.`, cible: 'offres' });

  for (const d of alertesDeclenchees(etat, t)) {
    const nom = trouverMarchand(d.alerte.marchandId)?.nom;
    liste.push({
      id: `alerte:${d.alerte.id}:${d.depuis}`,
      date: Math.max(d.depuis, d.alerte.date),
      icone: '🔔',
      titre: `Alerte : ${nom} à ${formatTaux(d.taux)}`,
      texte: `Votre seuil de ${formatTaux(d.alerte.seuil)} est atteint (${d.type === 'flash' ? "offre flash jusqu'à minuit" : 'boost jusqu’à dimanche'}).`,
      cible: 'offres',
    });
  }

  // Favoris en promo : alerte dédiée, en plus de l'annonce générale.
  if (etat.favoris.includes(flash.marchandId)) {
    const nom = trouverMarchand(flash.marchandId)?.nom;
    liste.push({ id: `fav-flash:${flash.fin}`, date: debutJour(t), icone: '♥', titre: `${nom}, votre favori, est en flash`, texte: `${formatTaux(flash.taux * palierActuel(etat, t).palier.multiplicateur)} aujourd'hui seulement.`, cible: 'offres' });
  }
  for (const id of boostsDeLaSemaine(t).filter((x) => etat.favoris.includes(x))) {
    const nom = trouverMarchand(id)?.nom;
    const lundiBoost = finDeSemaine(t) - SEMAINE;
    liste.push({ id: `fav-boost:${id}:${lundiBoost}`, date: lundiBoost, icone: '♥', titre: `${nom}, votre favori, est boosté`, texte: `${formatTaux(tauxMarchand(id, t) * palierActuel(etat, t).palier.multiplicateur)} jusqu'à dimanche.`, cible: 'offres' });
  }

  // Boosts de la semaine en cours, annoncés le lundi.
  const lundi = finDeSemaine(t) - SEMAINE;
  const { multiplicateur } = palierActuel(etat, t).palier;
  const noms = boostsDeLaSemaine(t).map((id) => `${trouverMarchand(id)?.nom} (${formatTaux(tauxMarchand(id, t) * multiplicateur)})`);
  liste.push({ id: `boost:${lundi}`, date: lundi, icone: '⚡', titre: 'Boosts de la semaine', texte: `Cashback ×1,5 chez ${noms.join(' et ')}.`, cible: 'offres' });

  // Défis réussis à récupérer : datés du dernier achat qui les a fait réussir.
  const dernierAchat = Math.max(0, ...etat.achats.filter((a) => a.date <= t).map((a) => a.date));
  for (const d of defisDuMois(t)) {
    const a = avancement(etat, d, t);
    if (a.reussi && !a.reclame) {
      liste.push({ id: `defi:${a.cle}`, date: dernierAchat, icone: '🏆', titre: `Défi « ${d.titre} » réussi`, texte: `Récupérez ${formatEuros(d.recompense)}.`, cible: 'defis' });
    }
  }
  const s = serie(etat, t);
  if (s.aRecuperer) {
    liste.push({ id: `serie:${s.debut}:${s.semaines}`, date: dernierAchat, icone: '🔥', titre: `Série de ${s.semaines} semaines`, texte: 'Une récompense de série vous attend.', cible: 'defis' });
  }

  return liste.filter((e) => e.date <= t).sort((a, b) => b.date - a.date).slice(0, 50);
}

export function nonLues(etat: Etat, t: number): number {
  return evenements(etat, t).filter((e) => e.date > etat.notificationsLues).length;
}
