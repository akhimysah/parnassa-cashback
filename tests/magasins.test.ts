import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { distanceKm, formatDistance, magasinsAutour, magasinsProches, PARIS } from '../src/magasins';
import { MARCHANDS } from '../src/marchands';
import { gainsDu } from '../src/recap';

const T = new Date(2026, 9, 14, 12).getTime();
const neuf = () => ({ ...M.etatInitial(() => 0.5), accueilVu: true });

describe('magasins', () => {
  it('calcule les distances', () => {
    expect(distanceKm(PARIS, PARIS)).toBe(0);
    // Paris – Lyon ≈ 392 km à vol d'oiseau.
    expect(distanceKm(PARIS, { lat: 45.764, lng: 4.8357 })).toBeGreaterThan(385);
    expect(distanceKm(PARIS, { lat: 45.764, lng: 4.8357 })).toBeLessThan(400);
    expect(formatDistance(0.432)).toBe('430 m');
    expect(formatDistance(2.46)).toBe('2,5 km');
  });

  it('place deux magasins par marchand physique, à moins de 3,5 km, de façon stable', () => {
    const physiques = MARCHANDS.filter((m) => m.enMagasin);
    const liste = magasinsAutour(PARIS);
    expect(liste).toHaveLength(physiques.length * 2);
    expect(new Set(liste.map((m) => m.id)).size).toBe(liste.length);
    for (const m of liste) expect(distanceKm(PARIS, m.position)).toBeLessThan(3.5);
    // Un petit déplacement (≈ 100 m) ne change pas les magasins.
    expect(magasinsAutour({ lat: PARIS.lat + 0.0009, lng: PARIS.lng })).toEqual(liste);
    expect(magasinsAutour({ lat: 43.2965, lng: 5.3698 })).not.toEqual(liste);
  });

  it('trie par distance croissante', () => {
    const d = magasinsProches(PARIS).map((m) => m.distance);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
});

describe('paiement en magasin', () => {
  it('applique le taux magasin, sans boost ni flash', () => {
    let e = M.basculerOffre(neuf(), 'table-ronde');
    expect(M.tauxEnMagasin(e, 'table-ronde', T)).toBe(10);
    expect(M.tauxEnMagasin(e, 'miam', T)).toBeNull();
    expect(M.tauxEnMagasin(neuf(), 'table-ronde', T)).toBe(M.TAUX_BASE);
    e = M.enregistrerAchat(e, 'table-ronde', 5000, T, 'La Table Ronde (magasin)', 'magasin');
    expect(e.achats[0]).toMatchObject({ cashback: 500, canal: 'magasin', libelle: 'La Table Ronde (magasin)' });
    expect(() => M.enregistrerAchat(M.basculerOffre(neuf(), 'miam'), 'miam', 1000, T, undefined, 'magasin')).toThrow(/magasin/);
  });

  it('n’ajoute pas de canal aux achats en ligne', () => {
    const e = M.enregistrerAchat(neuf(), null, 1000, T);
    expect('canal' in e.achats[0]).toBe(false);
  });
});

describe('objectif mensuel', () => {
  it('se règle et se mesure avec les gains du mois', () => {
    let e = M.regler(neuf(), { objectifMensuel: 2000 });
    expect(e.reglages.objectifMensuel).toBe(2000);
    expect(() => M.regler(e, { objectifMensuel: 0 })).toThrow(/Objectif/);
    e = M.crediterBonus(e, 'x', 'x', 500, T);
    e = M.enregistrerAchat(e, null, 10_000, T);
    expect(gainsDu(e, '2026-10')).toBe(550);
    expect(M.migrer({ ...e, reglages: { theme: 'auto' } })!.reglages.objectifMensuel).toBeNull();
  });
});
