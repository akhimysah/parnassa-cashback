import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { boostsAVenir, flashsAVenir, historiqueTaux, prochainePromo } from '../src/calendrier';
import { MARCHANDS } from '../src/marchands';
import { trouverSucces } from '../src/succes';

const T = new Date(2026, 9, 14, 12).getTime(); // mercredi
const neuf = () => ({ ...M.etatInitial(() => 0.5), accueilVu: true });

describe('dons', () => {
  it('prélève le disponible et garde l’association', () => {
    let e = M.crediterBonus(neuf(), 'x', 'x', 800, T);
    e = M.donner(e, 'forets', 300, T);
    expect(e.versements[0]).toMatchObject({ destination: 'don', montant: 300, associationId: 'forets' });
    expect(M.soldes(e).disponible).toBe(500);
    expect(() => M.donner(e, 'forets', 600, T)).toThrow(/insuffisant/);
    expect(trouverSucces('genereux')!.mesure(e, T)).toEqual([1, 1]);
    expect(trouverSucces('mecene')!.mesure(e, T)).toEqual([300, 5000]);
  });
});

describe('arrondis', () => {
  it('calcule la différence jusqu’à l’euro supérieur', () => {
    expect(M.arrondiDe(1234)).toBe(66);
    expect(M.arrondiDe(1200)).toBe(0);
    expect(M.arrondiDe(1)).toBe(99);
  });

  it('alimente le coffre à chaque achat quand le réglage est actif', () => {
    let e = M.enregistrerAchat(neuf(), null, 1234, T);
    expect(M.soldeCoffre(e)).toBe(0);
    e = M.regler(e, { arrondi: true });
    e = M.enregistrerAchat(e, null, 1234, T);
    e = M.enregistrerAchat(e, null, 500, T);
    expect(e.coffre.arrondis.map((a) => a.montant)).toEqual([66]);
    expect(M.soldeCoffre(e)).toBe(66);
    // Un retour produit ne reprend pas l'épargne déjà faite.
    e = M.annulerAchat(e, e.achats[1].id);
    expect(M.soldeCoffre(e)).toBe(66);
    expect(M.retirerCoffre(e, T).coffre.retraits[0].montant).toBe(66);
  });

  it('reprend les anciens états sans arrondis', () => {
    const e = M.migrer({ ...neuf(), coffre: { nom: 'X', objectif: 100, retraits: [] }, reglages: { theme: 'auto' } })!;
    expect(e.coffre.arrondis).toEqual([]);
    expect(e.reglages.arrondi).toBe(false);
    expect(M.soldeCoffre(e)).toBe(0);
  });
});

describe('calendrier des promos', () => {
  it('annonce les flashs jour par jour, cohérents avec l’offre du jour', () => {
    const jours = flashsAVenir(T, 7);
    expect(jours).toHaveLength(7);
    expect(jours[0].marchandId).toBe(M.offreFlash(T).marchandId);
    for (const j of jours) {
      expect(new Date(j.debut).getHours()).toBe(0);
      expect(M.offreFlash(j.debut + 3_600_000).marchandId).toBe(j.marchandId);
    }
    expect(new Set(jours.map((j) => new Date(j.debut).getDate())).size).toBe(7);
  });

  it('ne répète pas de motif entre jours voisins', () => {
    const jours = flashsAVenir(T, 60).map((j) => j.marchandId);
    for (const ecart of [1, 2, 3, 7]) {
      const repetitions = jours.slice(ecart).filter((id, i) => id === jours[i]).length;
      // Avec 13 marchands possibles, on attend environ 60 / 13 ≈ 5 coïncidences au hasard.
      expect(repetitions).toBeLessThan(15);
    }
  });

  it('annonce les boosts semaine par semaine', () => {
    const semaines = boostsAVenir(T, 4);
    expect(semaines[0].marchandIds).toEqual(M.boostsDeLaSemaine(T));
    for (const s of semaines) {
      expect(new Date(s.debut).getDay()).toBe(1);
      expect(s.marchandIds).toEqual(M.boostsDeLaSemaine(s.debut + M.JOUR));
    }
  });

  it('retrace le taux d’un marchand et trouve sa prochaine promo', () => {
    const boost = M.boostsDeLaSemaine(T)[0];
    const h = historiqueTaux(boost, T, 6, 2);
    expect(h).toHaveLength(9);
    expect(h[6].booste).toBe(true);
    const m = MARCHANDS.find((x) => x.id === boost)!;
    expect(h[6].max).toBeGreaterThanOrEqual(m.taux * M.COEF_BOOST);
    expect(h.every((p) => p.max >= m.taux)).toBe(true);
    const flash = M.offreFlash(T).marchandId;
    expect(prochainePromo(flash, T)).toMatchObject({ type: 'flash', quand: M.debutJour(T) });
  });
});
