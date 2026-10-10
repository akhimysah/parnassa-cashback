import { describe, expect, it } from 'vitest';
import { appliquerCode, CODES, codesDe } from '../src/codes';
import { MARCHANDS } from '../src/marchands';
import { ajouter, PRODUITS, totalPanier } from '../src/produits';

describe('codes promo', () => {
  it('applique une remise en pourcentage ou fixe', () => {
    expect(appliquerCode('atelier-nord', ' nord10 ', 10_000).remise).toBe(1000);
    expect(appliquerCode('sneak-lab', 'SNEAK15', 12_000).remise).toBe(1500);
  });

  it('refuse les codes inconnus, d’un autre marchand ou sous le minimum', () => {
    expect(() => appliquerCode('atelier-nord', 'XYZ', 10_000)).toThrow(/inconnu/);
    expect(() => appliquerCode('atelier-nord', 'SNEAK15', 10_000)).toThrow(/pas valable/);
    expect(() => appliquerCode('atelier-nord', 'NORD10', 7000)).toThrow(/minimum : 80,00 €/);
  });

  it('ne rend jamais un panier négatif', () => {
    expect(appliquerCode('miam', 'MIAMMIAM', 1500).remise).toBe(300);
    expect(appliquerCode('gamezone', 'GAME5', 4000).remise).toBe(500);
  });

  it('ne référence que des marchands existants, codes uniques', () => {
    expect(CODES.every((c) => MARCHANDS.some((m) => m.id === c.marchandId))).toBe(true);
    expect(new Set(CODES.map((c) => c.code)).size).toBe(CODES.length);
    expect(codesDe('railgo')).toEqual([]);
  });
});

describe('panier', () => {
  it('ajoute, retire et totalise', () => {
    const produits = PRODUITS.Mode;
    let p = ajouter({}, 'pull', 1);
    p = ajouter(p, 'pull', 1);
    p = ajouter(p, 'jean', 1);
    expect(totalPanier(produits, p)).toBe(6900 * 2 + 8900);
    p = ajouter(p, 'jean', -1);
    expect(p).toEqual({ pull: 2 });
    expect(ajouter(p, 'pull', 20).pull).toBe(9);
  });

  it('a des produits pour chaque catégorie', () => {
    for (const m of MARCHANDS) expect(PRODUITS[m.categorie].length).toBeGreaterThan(2);
  });
});
