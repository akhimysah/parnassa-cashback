import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';

const T0 = Date.UTC(2026, 9, 10);
const neuf = () => M.etatInitial(() => 0.5);

describe('calcul du cashback', () => {
  it('applique le taux de base hors partenaire', () => {
    expect(M.calculerCashback(neuf(), null, 10_000, T0)).toBe(50);
  });

  it('ignore le taux partenaire tant que l’offre n’est pas activée', () => {
    expect(M.calculerCashback(neuf(), 'atelier-nord', 10_000, T0)).toBe(50);
    const e = M.basculerOffre(neuf(), 'atelier-nord');
    expect(M.calculerCashback(e, 'atelier-nord', 10_000, T0)).toBe(800);
  });

  it('respecte le plafond par achat', () => {
    const e = M.basculerOffre(neuf(), 'miam');
    expect(M.calculerCashback(e, 'miam', 100_000, T0)).toBe(800);
  });
});

describe('cycle de vie', () => {
  it('passe de en attente à disponible après le délai, puis verse', () => {
    let e = M.basculerOffre(neuf(), 'table-ronde');
    e = M.enregistrerAchat(e, 'table-ronde', 10_000, T0);
    expect(M.soldes(e)).toMatchObject({ enAttente: 1200, disponible: 0 });
    expect(M.actualiser(e, T0 + 6 * M.JOUR)).toBe(e);
    e = M.actualiser(e, T0 + 7 * M.JOUR);
    expect(M.soldes(e)).toMatchObject({ enAttente: 0, disponible: 1200 });
    e = M.verser(e, T0 + 8 * M.JOUR);
    expect(M.soldes(e)).toMatchObject({ disponible: 0, verse: 1200, totalGagne: 1200 });
  });

  it('refuse un versement sous le minimum', () => {
    let e = M.enregistrerAchat(neuf(), null, 10_000, T0);
    e = M.actualiser(e, T0 + 31 * M.JOUR);
    expect(() => M.verser(e, T0)).toThrow(/Minimum/);
  });

  it('annule le cashback en attente lors d’un retour produit, pas un cashback déjà disponible', () => {
    let e = M.enregistrerAchat(neuf(), null, 10_000, T0);
    const id = e.achats[0].id;
    expect(M.soldes(M.annulerAchat(e, id)).enAttente).toBe(0);
    e = M.annulerAchat(M.actualiser(e, T0 + 31 * M.JOUR), id);
    expect(M.soldes(e).disponible).toBe(50);
  });

  it('crédite le parrainage après son délai', () => {
    let e = M.ajouterParrainage(neuf(), 'Léa', T0);
    expect(M.soldes(e).enAttente).toBe(M.BONUS_PARRAINAGE);
    e = M.actualiser(e, T0 + M.DELAI_PARRAINAGE_JOURS * M.JOUR);
    expect(M.soldes(e).disponible).toBe(M.BONUS_PARRAINAGE);
  });
});

describe('paliers', () => {
  it('monte de palier avec les dépenses et multiplie le cashback', () => {
    let e = M.enregistrerAchat(neuf(), null, 60_000, T0);
    expect(M.palierActuel(e, T0).palier.nom).toBe('Argent');
    expect(M.calculerCashback(e, null, 10_000, T0)).toBe(60);
    e = M.enregistrerAchat(e, null, 150_000, T0);
    expect(M.palierActuel(e, T0).palier.nom).toBe('Or');
  });

  it('ne compte que les 12 derniers mois et pas les achats annulés', () => {
    let e = M.enregistrerAchat(neuf(), null, 60_000, T0);
    expect(M.palierActuel(e, T0 + 366 * M.JOUR).palier.nom).toBe('Bronze');
    e = M.annulerAchat(e, e.achats[0].id);
    expect(M.palierActuel(e, T0).palier.nom).toBe('Bronze');
  });
});

describe('saisie', () => {
  it('lit les montants en euros', () => {
    expect(M.lireMontant('12,50')).toBe(1250);
    expect(M.lireMontant('12.5 €')).toBe(1250);
    expect(M.lireMontant('0')).toBeNull();
    expect(M.lireMontant('abc')).toBeNull();
    expect(M.lireMontant('1,234')).toBeNull();
  });
});
