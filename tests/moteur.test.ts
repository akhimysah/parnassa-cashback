import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { MARCHANDS } from '../src/marchands';

const BASE = Date.UTC(2026, 9, 10);
const SANS_BOOST = ['atelier-nord', 'miam', 'table-ronde'];
let T0 = BASE;
const promu = (t: number) => [...M.boostsDeLaSemaine(t), M.offreFlash(t).marchandId];
while (promu(T0).some((id) => SANS_BOOST.includes(id))) T0 += M.JOUR;
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

describe('boosts de la semaine', () => {
  it('tire deux marchands distincts, stables pendant la semaine', () => {
    const b = M.boostsDeLaSemaine(T0);
    expect(new Set(b).size).toBe(M.BOOSTS_PAR_SEMAINE);
    const fin = M.finDeSemaine(T0);
    expect(new Date(fin).getDay()).toBe(1);
    expect(new Date(fin).getHours()).toBe(0);
    expect(M.boostsDeLaSemaine(fin - 1)).toEqual(b);
    expect(M.boostsDeLaSemaine(fin - M.SEMAINE + 2 * 3_600_000)).toEqual(b);
    expect(M.numeroSemaine(fin)).toBe(M.numeroSemaine(T0) + 1);
  });

  it('change d’une semaine à l’autre sur l’année', () => {
    const tirages = new Set<string>();
    for (let i = 0; i < 52; i++) tirages.add(M.boostsDeLaSemaine(T0 + i * M.SEMAINE).join());
    expect(tirages.size).toBeGreaterThan(20);
  });

  it('multiplie le taux d’une offre activée et boostée', () => {
    const id = M.boostsDeLaSemaine(T0)[0];
    const taux = MARCHANDS.find((m) => m.id === id)!.taux;
    expect(M.tauxMarchand(id, T0)).toBeCloseTo(taux * M.COEF_BOOST);
    const e = M.basculerOffre(neuf(), id);
    expect(M.tauxEffectif(e, id, T0)).toBeCloseTo(taux * M.COEF_BOOST);
    expect(M.tauxEffectif(neuf(), id, T0)).toBe(M.TAUX_BASE);
  });
});

describe('bonus', () => {
  it('ne crédite qu’une fois une même clé et compte dans le disponible', () => {
    let e = M.crediterBonus(neuf(), '2026-10:x', 'Défi', 500, T0);
    expect(M.soldes(e).disponible).toBe(500);
    expect(() => M.crediterBonus(e, '2026-10:x', 'Défi', 500, T0)).toThrow();
    e = M.crediterBonus(e, '2026-11:x', 'Défi', 500, T0);
    expect(M.soldes(e).disponible).toBe(1000);
  });
});

describe('offre flash du jour', () => {
  it('double le taux d’un marchand non boosté, jusqu’à minuit', () => {
    const f = M.offreFlash(T0);
    const m = MARCHANDS.find((x) => x.id === f.marchandId)!;
    expect(M.boostsDeLaSemaine(T0)).not.toContain(f.marchandId);
    expect(f.taux).toBe(Math.min(m.taux * 2, Math.max(m.taux, M.TAUX_FLASH_MAX)));
    expect(M.tauxMarchand(f.marchandId, T0)).toBe(f.taux);
    expect(f.fin).toBe(M.finJour(T0));
    expect(M.offreFlash(f.fin - 1).marchandId).toBe(f.marchandId);
    expect(M.offreFlash(M.debutJour(T0)).marchandId).toBe(f.marchandId);
  });

  it('change de marchand selon les jours', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) ids.add(M.offreFlash(T0 + i * M.JOUR).marchandId);
    expect(ids.size).toBeGreaterThan(6);
  });

  it('ne dépasse jamais le plafond flash, sauf si le taux normal est déjà plus haut', () => {
    for (let i = 0; i < 60; i++) {
      const f = M.offreFlash(T0 + i * M.JOUR);
      const m = MARCHANDS.find((x) => x.id === f.marchandId)!;
      expect(f.taux).toBeLessThanOrEqual(Math.max(M.TAUX_FLASH_MAX, m.taux));
      expect(f.taux).toBeGreaterThanOrEqual(m.taux);
    }
  });
});
