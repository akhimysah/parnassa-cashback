import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { CATALOGUE, DEFIS_PAR_MOIS, avancement, cleMois, defisDuMois, reclamerDefi } from '../src/defis';
import { gainsParCategorie, gainsParMois } from '../src/statistiques';

const T = new Date(2026, 9, 15, 12).getTime();
const neuf = () => M.etatInitial(() => 0.5);
const defi = (id: string) => CATALOGUE.find((d) => d.id === id)!;

describe('défis du mois', () => {
  it('tire trois défis distincts, identiques tout le mois', () => {
    const d = defisDuMois(T).map((x) => x.id);
    expect(new Set(d).size).toBe(DEFIS_PAR_MOIS);
    expect(defisDuMois(new Date(2026, 9, 1).getTime()).map((x) => x.id)).toEqual(d);
    expect(defisDuMois(new Date(2026, 9, 31, 23).getTime()).map((x) => x.id)).toEqual(d);
  });

  it('compte les achats par catégorie partenaire, hors annulés et hors autres mois', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    e = M.enregistrerAchat(e, 'miam', 2_000, T);
    e = M.enregistrerAchat(e, 'miam', 2_000, T);
    e = M.enregistrerAchat(e, null, 2_000, T);
    e = M.enregistrerAchat(e, 'miam', 2_000, new Date(2026, 8, 20).getTime());
    expect(avancement(e, defi('gourmand'), T)).toMatchObject({ fait: 2, objectif: 3, reussi: false });
    e = M.enregistrerAchat(e, 'miam', 2_000, T);
    expect(avancement(e, defi('gourmand'), T).reussi).toBe(true);
    e = M.annulerAchat(e, e.achats[0].id);
    expect(avancement(e, defi('gourmand'), T).reussi).toBe(false);
  });

  it('compte les partenaires distincts et la dépense', () => {
    let e = neuf();
    for (const id of ['miam', 'pixel', 'eclat', 'railgo']) {
      e = M.basculerOffre(e, id);
      e = M.enregistrerAchat(e, id, 10_000, T);
    }
    expect(avancement(e, defi('explorateur'), T).reussi).toBe(true);
    expect(avancement(e, defi('gros-panier'), T).reussi).toBe(true);
    expect(avancement(e, defi('grand-acheteur'), T)).toMatchObject({ fait: 30_000, reussi: true });
  });

  it('ne laisse réclamer qu’un défi du mois, réussi, une seule fois', () => {
    let e = neuf();
    const absent = CATALOGUE.find((d) => !defisDuMois(T).some((x) => x.id === d.id))!;
    expect(() => reclamerDefi(e, absent.id, T)).toThrow(/programme/);
    const premier = defisDuMois(T)[0];
    expect(() => reclamerDefi(e, premier.id, T)).toThrow(/pas encore/);
    // Réussir tous les défis possibles d'un coup.
    for (const m of ['miam', 'table-ronde', 'pixel', 'eclat', 'railgo', 'cap-horizon', 'atelier-nord', 'sneak-lab', 'panier-frais', 'bio-coin']) {
      e = M.basculerOffre(e, m);
      for (let i = 0; i < 4; i++) e = M.enregistrerAchat(e, m, 10_000, T);
    }
    for (const d of defisDuMois(T)) e = reclamerDefi(e, d.id, T);
    expect(e.bonus).toHaveLength(DEFIS_PAR_MOIS);
    expect(e.bonus[0].cle.startsWith(cleMois(T))).toBe(true);
    expect(() => reclamerDefi(e, premier.id, T)).toThrow(/déjà/);
  });
});

describe('statistiques', () => {
  it('répartit les gains par mois et par catégorie', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    e = M.enregistrerAchat(e, 'miam', 5_000, T);
    e = M.enregistrerAchat(e, null, 10_000, new Date(2026, 7, 3).getTime());
    e = M.crediterBonus(e, 'k', 'Défi', 300, T);
    const mois = gainsParMois(e, T, 6);
    expect(mois).toHaveLength(6);
    expect(mois[5]).toMatchObject({ cle: '2026-10', bonus: 300 });
    expect(mois[5].cashback).toBeGreaterThan(0);
    expect(mois[3]).toMatchObject({ cle: '2026-08', cashback: 50 });
    const cats = gainsParCategorie(e);
    expect(cats.map((c) => c.categorie)).toEqual(['Restaurants', 'Hors partenaires']);
  });
});
