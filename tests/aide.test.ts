import { describe, expect, it } from 'vitest';
import * as M from '../src/moteur';
import { ajouterAlerte, alertesDeclenchees, MAX_ALERTES, supprimerAlerte } from '../src/alertes';
import { chercher, envoyerMessage, FAQ, normaliser } from '../src/aide';
import { AMIS_DEMO, classement, gainsAmi } from '../src/classement';
import { MARCHANDS } from '../src/marchands';
import { evenements } from '../src/notifications';

const T = new Date(2026, 9, 14, 12).getTime();
const neuf = () => ({ ...M.etatInitial(() => 0.5), accueilVu: true });

describe('alertes de taux', () => {
  it('se déclenche quand un boost ou un flash atteint le seuil', () => {
    const boost = M.boostsDeLaSemaine(T)[0];
    const m = MARCHANDS.find((x) => x.id === boost)!;
    let e = ajouterAlerte(neuf(), boost, m.taux * 1.4, T);
    const d = alertesDeclenchees(e, T);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ type: 'boost', depuis: M.finDeSemaine(T) - M.SEMAINE });
    expect(evenements(e, T).some((x) => x.titre.startsWith(`Alerte : ${m.nom}`))).toBe(true);
    // Seuil plus haut que le boost : rien.
    e = ajouterAlerte(neuf(), boost, m.taux * 1.6, T);
    expect(alertesDeclenchees(e, T)).toEqual([]);
  });

  it('valide le seuil, remplace l’alerte d’un même marchand et se supprime', () => {
    expect(() => ajouterAlerte(neuf(), 'atelier-nord', 8, T)).toThrow(/au-dessus/);
    expect(() => ajouterAlerte(neuf(), 'atelier-nord', 60, T)).toThrow(/élevé/);
    expect(() => ajouterAlerte(neuf(), 'nope', 10, T)).toThrow(/inconnu/);
    let e = ajouterAlerte(neuf(), 'atelier-nord', 10, T);
    e = ajouterAlerte(e, 'atelier-nord', 12, T + 1);
    expect(e.alertes).toHaveLength(1);
    expect(e.alertes[0].seuil).toBe(12);
    expect(supprimerAlerte(e, e.alertes[0].id).alertes).toEqual([]);
    let plein = neuf();
    for (const m of MARCHANDS.slice(0, MAX_ALERTES)) plein = ajouterAlerte(plein, m.id, m.taux + 1, T);
    expect(() => ajouterAlerte(plein, MARCHANDS[MAX_ALERTES].id, 30, T)).toThrow(/maximum/);
  });
});

describe('centre d’aide', () => {
  it('cherche sans tenir compte des accents ni de l’ordre des mots', () => {
    expect(normaliser('Réclamation À')).toBe('reclamation a');
    expect(chercher('')).toHaveLength(FAQ.length);
    expect(chercher('retour produit')[0].q).toMatch(/retour produit/);
    expect(chercher('PALIERS').length).toBeGreaterThan(0);
    expect(chercher('magasin boost').length).toBeGreaterThan(0);
    expect(chercher('zzzz')).toEqual([]);
  });

  it('enregistre un message valide', () => {
    expect(() => envoyerMessage(neuf(), 'ab', 'message assez long', T)).toThrow(/sujet/);
    expect(() => envoyerMessage(neuf(), 'Sujet', 'court', T)).toThrow(/mots/);
    const e = envoyerMessage(neuf(), '  Achat manquant ', 'Mon achat de mardi n’apparaît pas.', T);
    expect(e.support[0]).toMatchObject({ sujet: 'Achat manquant', date: T });
  });
});

describe('classement', () => {
  it('range vos gains parmi vos filleuls et les amis de démonstration', () => {
    let e = M.ajouterParrainage(neuf(), 'Léa', T - M.JOUR);
    e = M.crediterBonus(e, 'x', 'x', 100_000, T);
    const c = classement(e, T);
    expect(c).toHaveLength(2 + AMIS_DEMO.length);
    expect(c[0]).toMatchObject({ nom: 'Vous', moi: true });
    expect(c.map((p) => p.gains)).toEqual([...c.map((p) => p.gains)].sort((a, b) => b - a));
  });

  it('simule des gains stables dans la journée et croissants dans le mois', () => {
    expect(gainsAmi('Camille', T)).toBe(gainsAmi('Camille', T + 3_600_000));
    expect(gainsAmi('Camille', T + 5 * M.JOUR)).toBeGreaterThan(gainsAmi('Camille', T));
    const fin = gainsAmi('Camille', new Date(2026, 9, 31, 12).getTime());
    expect(fin).toBeGreaterThanOrEqual(500);
    expect(fin).toBeLessThanOrEqual(6000);
  });
});
