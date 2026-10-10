// Centre de notifications : les événements sont déduits de l'état, rien n'est stocké en double.

import { avancement, defisDuMois } from './defis';
import { trouverMarchand } from './marchands';
import type { SousProfil } from './App';
import { BONUS_PARRAINAGE, boostsDeLaSemaine, finDeSemaine, formatEuros, formatTaux, palierActuel, SEMAINE, tauxMarchand, type Etat } from './moteur';
import { serie } from './serie';

export interface Evenement {
  id: string;
  date: number;
  icone: string;
  titre: string;
  texte: string;
  /** Onglet à ouvrir quand on touche l'événement. */
  cible: 'accueil' | 'offres' | 'defis' | 'activite' | 'profil';
  sous?: SousProfil;
}

export function evenements(etat: Etat, t: number): Evenement[] {
  const liste: Evenement[] = [];

  for (const a of etat.achats) {
    if (a.statut === 'disponible' && a.disponibleLe <= t && !a.id.endsWith('-achat')) {
      liste.push({ id: `dispo:${a.id}`, date: a.disponibleLe, icone: '✅', titre: 'Cashback disponible', texte: `${formatEuros(a.cashback)} de ${a.libelle} peuvent être versés.`, cible: 'accueil' });
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
