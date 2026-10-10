// @vitest-environment jsdom
import './preparation';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../../src/App';
import * as M from '../../src/moteur';

// Les montants sont formatés avec une espace fine insécable avant « € » : d'où les \s dans les motifs.
const CLE = 'parnassa-cashback:v1';

/** Démarre l'application sur un état préparé (écran de bienvenue déjà vu). */
function demarrer(preparer: (e: M.Etat, t: number) => M.Etat = (e) => e) {
  const t = Date.now();
  localStorage.setItem(CLE, JSON.stringify(preparer({ ...M.etatInitial(() => 0.5), accueilVu: true }, t)));
  return render(<App />);
}

const etatEnregistre = (): M.Etat => JSON.parse(localStorage.getItem(CLE)!);
const onglet = (nom: string) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation principale' })).getByRole('button', { name: new RegExp(nom) }));

describe('parcours utilisateur', () => {
  it('affiche la bienvenue au premier lancement, puis l’accueil', () => {
    render(<App />);
    expect(screen.getByRole('dialog', { name: /Faites-vous rembourser/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.queryByRole('dialog', { name: /Faites-vous rembourser/ })).toBeNull();
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(etatEnregistre().accueilVu).toBe(true);
  });

  it('met du cashback de côté dans le coffre', () => {
    demarrer((e, t) => M.crediterBonus(e, 'test', 'Bonus', 3000, t));
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser mon cashback' }));
    fireEvent.click(screen.getByRole('radio', { name: /Mon coffre/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Montant à mettre de côté' }), { target: { value: '12,50' } });
    fireEvent.click(screen.getByRole('button', { name: /Mettre de côté 12,50/ }));
    expect(M.soldeCoffre(etatEnregistre())).toBe(1250);
    expect(screen.getByRole('status').textContent).toMatch(/12,50\s€ mis de côté/);
  });

  it('achète dans la boutique de démonstration avec un code promo', async () => {
    demarrer();
    onglet('Offres');
    fireEvent.click(screen.getByRole('button', { name: "Détails de l'offre Atelier Nord" }));
    fireEvent.click(screen.getByRole('button', { name: /Activer et aller sur le site/ }));
    // Redirection (1,4 s) puis boutique, chargée à la demande.
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter Jean droit brut' }, { timeout: 4000 }));
    fireEvent.click(screen.getByRole('button', { name: 'NORD10' }));
    fireEvent.click(screen.getByRole('button', { name: /Payer 80,10\s€ avec ma carte Parnassa/ }));
    expect(await screen.findByText('Commande validée')).toBeTruthy();
    const achat = etatEnregistre().achats[0];
    expect(achat).toMatchObject({ marchandId: 'atelier-nord', montant: 8010, statut: 'en_attente' });
    expect(etatEnregistre().offresActivees).toContain('atelier-nord');
  });

  it('crée et retrouve une alerte de taux', () => {
    demarrer();
    onglet('Offres');
    fireEvent.click(screen.getByRole('button', { name: "Détails de l'offre Pixel Store" }));
    fireEvent.click(screen.getByRole('button', { name: /M'alerter/ }));
    fireEvent.change(screen.getByLabelText(/Prévenez-moi quand Pixel Store/), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(etatEnregistre().alertes[0]).toMatchObject({ marchandId: 'pixel', seuil: 4 });
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    onglet('Profil');
    fireEvent.click(screen.getByRole('button', { name: /Alertes de taux/ }));
    expect(screen.getByRole('button', { name: "Supprimer l'alerte Pixel Store" })).toBeTruthy();
  });

  it('cherche dans le centre d’aide', () => {
    demarrer();
    onglet('Profil');
    fireEvent.click(screen.getByRole('button', { name: /Aide et contact/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: "Rechercher dans l'aide" }), { target: { value: 'retour produit' } });
    expect(screen.getAllByRole('group')[0].textContent).toMatch(/retour produit/);
  });

  it('montre le classement du mois', () => {
    demarrer((e, t) => M.ajouterParrainage(e, 'Léa', t));
    onglet('Défis');
    fireEvent.click(screen.getByRole('tab', { name: 'Classement' }));
    expect(screen.getByText('Vous')).toBeTruthy();
    expect(screen.getByText('Léa')).toBeTruthy();
  });

  it('refuse un versement sous le minimum avec un message', () => {
    demarrer((e, t) => M.crediterBonus(e, 'test', 'Bonus', 500, t));
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser mon cashback' }));
    expect((screen.getByRole('button', { name: /Verser 5,00\s€/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
