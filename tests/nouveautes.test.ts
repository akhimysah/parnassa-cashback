import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { acheterCarte, marquerCarte, valeurCarte } from '../src/cartes';
import { recupererSerie, serie } from '../src/serie';
import { evenements, nonLues } from '../src/notifications';

const T = new Date(2026, 9, 14, 12).getTime(); // mercredi
const neuf = () => M.etatInitial(() => 0.5);

/** État avec `centimes` de cashback disponible (via des bonus). */
function avecDisponible(centimes: number): M.Etat {
  return M.crediterBonus(neuf(), 'test', 'Test', centimes, T);
}

describe('migration', () => {
  it('complète un état de la première version', () => {
    const ancien = { version: 1, codeParrainage: 'PARN-AAAAAA', offresActivees: ['miam'], achats: [], parrainages: [], versements: [{ id: 'v', montant: 1000, date: 1 }], decalage: 0 };
    const e = M.migrer(ancien)!;
    expect(e.bonus).toEqual([]);
    expect(e.versements[0].destination).toBe('compte');
    expect(e.reglages.theme).toBe('auto');
    expect(e.coffre.retraits).toEqual([]);
    expect(e.accueilVu).toBe(true);
    expect(e.offresActivees).toEqual(['miam']);
  });

  it('rejette les données illisibles', () => {
    expect(M.migrer(null)).toBeNull();
    expect(M.migrer({ version: 2 })).toBeNull();
    expect(M.migrer({ version: 1 })).toBeNull();
  });
});

describe('versements et coffre', () => {
  it('verse un montant partiel au coffre sans minimum, puis le retire', () => {
    let e = avecDisponible(800);
    expect(() => M.verser(e, T)).toThrow(/Minimum/);
    e = M.verser(e, T, 'coffre', 500);
    expect(M.soldes(e).disponible).toBe(300);
    expect(M.soldeCoffre(e)).toBe(500);
    expect(() => M.retirerCoffre(e, T, 600)).toThrow();
    e = M.retirerCoffre(e, T, 200);
    expect(M.soldeCoffre(e)).toBe(300);
    e = M.retirerCoffre(e, T);
    expect(M.soldeCoffre(e)).toBe(0);
    expect(() => M.verser(e, T, 'coffre', 400)).toThrow(/insuffisant/);
  });

  it('règle le coffre', () => {
    const e = M.reglerCoffre(neuf(), '  Vacances  ', 50_000);
    expect(e.coffre).toMatchObject({ nom: 'Vacances', objectif: 50_000 });
    expect(() => M.reglerCoffre(e, ' ', 100)).toThrow();
    expect(() => M.reglerCoffre(e, 'x', 0)).toThrow();
  });

  it('verse automatiquement au-delà du seuil', () => {
    let e = M.regler(avecDisponible(2500), { autoSeuil: 3000, autoDestination: 'coffre' });
    expect(M.appliquerAutomatismes(e, T)).toBe(e);
    e = M.crediterBonus(e, 'x', 'x', 600, T);
    e = M.appliquerAutomatismes(e, T);
    expect(M.soldeCoffre(e)).toBe(3100);
    expect(M.soldes(e).disponible).toBe(0);
    expect(() => M.regler(e, { autoSeuil: 500 })).toThrow(/Seuil/);
    expect(M.appliquerAutomatismes(M.regler(e, { autoSeuil: null }), T).versements).toHaveLength(1);
  });
});

describe('cartes cadeaux', () => {
  it('convertit le cashback avec le bonus du marchand', () => {
    let e = avecDisponible(2500);
    expect(valeurCarte('miam', 2000)).toBe(2160);
    e = acheterCarte(e, 'miam', 2000, T, () => 0);
    expect(e.cartes[0]).toMatchObject({ marchandId: 'miam', paye: 2000, valeur: 2160, utilisee: false });
    expect(e.cartes[0].code).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/);
    expect(M.soldes(e).disponible).toBe(500);
    expect(() => acheterCarte(e, 'miam', 1000, T)).toThrow(/insuffisant/);
    expect(() => acheterCarte(avecDisponible(5000), 'railgo', 1000, T)).toThrow(/Pas de carte/);
    expect(() => acheterCarte(avecDisponible(5000), 'miam', 1500, T)).toThrow(/non proposé/);
    expect(marquerCarte(e, e.cartes[0].id, true).cartes[0].utilisee).toBe(true);
  });
});

describe('réclamations', () => {
  it('crédite un achat oublié après étude', () => {
    let e = M.declarerReclamation(neuf(), 'atelier-nord', 10_000, T - 3 * M.JOUR, T);
    expect(e.reclamations[0].statut).toBe('en_etude');
    expect(M.actualiser(e, T + 13 * M.JOUR)).toBe(e);
    e = M.actualiser(e, T + M.DELAI_RECLAMATION_JOURS * M.JOUR);
    expect(e.reclamations[0].statut).toBe('acceptee');
    expect(e.achats[0]).toMatchObject({ marchandId: 'atelier-nord', cashback: 800, statut: 'disponible' });
    expect(M.soldes(e).disponible).toBe(800);
  });

  it('refuse un achat déjà crédité', () => {
    let e = M.basculerOffre(neuf(), 'atelier-nord');
    e = M.enregistrerAchat(e, 'atelier-nord', 10_000, T - M.JOUR);
    e = M.declarerReclamation(e, 'atelier-nord', 10_000, T - M.JOUR, T);
    e = M.actualiser(e, T + 20 * M.JOUR);
    expect(e.reclamations[0]).toMatchObject({ statut: 'refusee' });
    expect(e.achats).toHaveLength(1);
  });

  it('valide la saisie', () => {
    expect(() => M.declarerReclamation(neuf(), 'inconnu', 100, T, T)).toThrow(/inconnu/);
    expect(() => M.declarerReclamation(neuf(), 'miam', 100, T + M.JOUR, T)).toThrow(/futur/);
    expect(() => M.declarerReclamation(neuf(), 'miam', 100, T - 91 * M.JOUR, T)).toThrow(/90/);
    const e = M.declarerReclamation(neuf(), 'miam', 100, T, T);
    expect(() => M.declarerReclamation(e, 'miam', 100, T - 3_600_000, T)).toThrow(/existe/);
  });
});

describe('série hebdomadaire', () => {
  it('compte les semaines consécutives et récompense toutes les 4 semaines', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    for (let i = 1; i <= 4; i++) e = M.enregistrerAchat(e, 'miam', 1000, T - i * M.SEMAINE);
    expect(serie(e, T)).toMatchObject({ semaines: 4, semaineFaite: false, aRecuperer: 1 });
    e = M.enregistrerAchat(e, 'miam', 1000, T);
    expect(serie(e, T)).toMatchObject({ semaines: 5, semaineFaite: true });
    e = recupererSerie(e, T);
    expect(serie(e, T).aRecuperer).toBe(0);
    expect(() => recupererSerie(e, T)).toThrow();
    expect(serie(e, T + 2 * M.SEMAINE).semaines).toBe(0);
  });

  it('ignore les paiements hors partenaires', () => {
    const e = M.enregistrerAchat(neuf(), null, 1000, T);
    expect(serie(e, T).semaines).toBe(0);
  });
});

describe('notifications', () => {
  it('annonce les boosts, le cashback disponible et compte les non lues', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    e = M.enregistrerAchat(e, 'miam', 5000, T);
    const plusTard = T + 8 * M.JOUR;
    e = M.actualiser(e, plusTard);
    const ev = evenements(e, plusTard);
    expect(ev.some((x) => x.titre === 'Cashback disponible')).toBe(true);
    expect(ev.some((x) => x.id.startsWith('boost:'))).toBe(true);
    expect(nonLues(e, plusTard)).toBe(ev.length);
    expect(nonLues({ ...e, notificationsLues: plusTard }, plusTard)).toBe(0);
    expect(ev.every((x) => x.date <= plusTard)).toBe(true);
  });
});
