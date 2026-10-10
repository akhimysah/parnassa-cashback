import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { debloquerSucces, SUCCES, trouverSucces } from '../src/succes';
import { moisActifs, recapMois } from '../src/recap';
import { DEPENSES_TYPE, estimer, meilleurMarchand } from '../src/simulateur';
import { exporterSauvegarde, lireSauvegarde } from '../src/sauvegarde';
import { de } from '../src/notifications';

const T = new Date(2026, 9, 14, 12).getTime();
const neuf = () => ({ ...M.etatInitial(() => 0.5), accueilVu: true });

describe('succès', () => {
  it('se débloquent une seule fois, à la date du premier passage', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    expect(debloquerSucces(e, T)).toBe(e);
    e = M.enregistrerAchat(e, 'miam', 1000, T);
    e = debloquerSucces(e, T);
    expect(e.succes['premier-achat']).toBe(T);
    const rejoue = debloquerSucces(e, T + M.JOUR);
    expect(rejoue).toBe(e);
    // Un retour produit ne retire pas un succès acquis.
    e = debloquerSucces(M.annulerAchat(e, e.achats[0].id), T + M.JOUR);
    expect(e.succes['premier-achat']).toBe(T);
  });

  it('mesure les paliers, la diversité et le coffre', () => {
    let e = neuf();
    for (const id of ['miam', 'pixel', 'eclat', 'railgo', 'atelier-nord']) {
      e = M.basculerOffre(e, id);
      e = M.enregistrerAchat(e, id, 12_000, T);
    }
    expect(trouverSucces('explorateur')!.mesure(e, T)).toEqual([5, 5]);
    expect(trouverSucces('argent')!.mesure(e, T)).toEqual([1, 1]);
    expect(trouverSucces('or')!.mesure(e, T)).toEqual([1, 2]);
    e = M.crediterBonus(e, 'x', 'x', 6000, T);
    e = M.verser(e, T, 'coffre', 5000);
    e = debloquerSucces(e, T);
    expect(Object.keys(e.succes)).toEqual(expect.arrayContaining(['premier-achat', 'explorateur', 'argent', 'epargnant', 'dix-euros']));
    expect(e.succes.or).toBeUndefined();
  });

  it('reconnaît un achat fait pendant une offre flash', () => {
    const f = M.offreFlash(T);
    let e = M.basculerOffre(neuf(), f.marchandId);
    e = M.enregistrerAchat(e, f.marchandId, 1000, T);
    expect(trouverSucces('flash')!.mesure(e, T)).toEqual([1, 1]);
  });

  it('ont des identifiants uniques', () => {
    expect(new Set(SUCCES.map((s) => s.id)).size).toBe(SUCCES.length);
  });
});

describe('récap mensuel', () => {
  it('résume le mois et le compare au précédent', () => {
    let e = M.basculerOffre(M.basculerOffre(neuf(), 'miam'), 'atelier-nord');
    e = M.enregistrerAchat(e, 'miam', 2000, new Date(2026, 8, 10).getTime());
    e = M.enregistrerAchat(e, 'atelier-nord', 10_000, T);
    e = M.enregistrerAchat(e, 'miam', 3000, T);
    e = M.enregistrerAchat(e, null, 1000, T);
    e = M.crediterBonus(e, '2026-10:fidele', 'Défi', 200, T);
    const sept = recapMois(e, '2026-09');
    const oct = recapMois(e, '2026-10');
    expect(moisActifs(e)).toEqual(['2026-10', '2026-09']);
    expect(oct.libelle).toBe('octobre 2026');
    expect(oct.achats).toBe(3);
    expect(oct.depense).toBe(14_000);
    expect(oct.marchands).toBe(2);
    expect(oct.defis).toBe(1);
    expect(oct.meilleurMarchand?.nom).toBe('Atelier Nord');
    expect(oct.categorieTop).toBe('Mode');
    const cashbackOctobre = e.achats.filter((a) => a.date === T).reduce((s, a) => s + a.cashback, 0);
    expect(oct.gagne).toBe(cashbackOctobre + 200);
    expect(oct.evolution).toBe(Math.round(((oct.gagne - sept.gagne) / sept.gagne) * 100));
    expect(sept.evolution).toBeNull();
  });

  it('gère un mois vide', () => {
    const r = recapMois(neuf(), '2026-01');
    expect(r).toMatchObject({ gagne: 0, achats: 0, tauxMoyen: 0, meilleurMarchand: null, categorieTop: null, evolution: null });
  });
});

describe('simulateur', () => {
  it('prend le meilleur partenaire par catégorie et applique le palier', () => {
    expect(meilleurMarchand('Restaurants').id).toBe('table-ronde');
    const r = estimer({ Restaurants: 10_000 }, 20_000, 1);
    expect(r.lignes.find((l) => l.categorie === 'Restaurants')!.mensuel).toBe(1200);
    expect(r.horsPartenaires).toBe(100);
    expect(r.mensuel).toBe(1300);
    expect(r.annuel).toBe(15_600);
    expect(estimer({ Restaurants: 10_000 }, 0, 1.5).mensuel).toBe(1800);
    expect(estimer({ Mode: -500 }, -1, 1).mensuel).toBe(0);
    expect(estimer(DEPENSES_TYPE, 0, 1).annuel).toBeGreaterThan(0);
  });
});

describe('sauvegarde', () => {
  it('fait l’aller-retour complet', () => {
    let e = M.basculerOffre(neuf(), 'miam');
    e = M.enregistrerAchat(e, 'miam', 5000, T);
    e = M.basculerFavori(e, 'pixel');
    const relu = lireSauvegarde(exporterSauvegarde(e, T));
    expect(relu).toEqual(e);
  });

  it('refuse les fichiers étrangers ou abîmés', () => {
    expect(() => lireSauvegarde('pas du json')).toThrow(/lisible/);
    expect(() => lireSauvegarde('{"a":1}')).toThrow(/Parnassa/);
    expect(() => lireSauvegarde('{"format":"parnassa-cashback","etat":{"version":1}}')).toThrow(/endommagée/);
  });
});

describe('français', () => {
  it('élide « de » devant une voyelle', () => {
    expect(de('Éclat Beauté')).toBe('d’Éclat Beauté');
    expect(de('Atelier Nord')).toBe('d’Atelier Nord');
    expect(de('Miam Express')).toBe('de Miam Express');
  });
});
