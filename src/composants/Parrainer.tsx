import { useState } from 'react';
import type { Contexte } from '../App';
import * as M from '../moteur';

export function Parrainer({ etat, modifier, signaler }: Contexte) {
  const [prenom, setPrenom] = useState('');
  const gagne = etat.parrainages.filter((p) => p.statut === 'disponible').length * M.BONUS_PARRAINAGE;

  return (
    <>
      <h1>Parrainer</h1>
      <section className="heros compact">
        <p className="etiquette">Vous gagnez {M.formatEuros(M.BONUS_PARRAINAGE)} par ami</p>
        <p className="code">{etat.codeParrainage}</p>
        <button
          className="bouton blanc"
          onClick={async () => {
            const texte = `Rejoins Parnassa avec mon code ${etat.codeParrainage} et récupère du cashback sur tes achats !`;
            try {
              if (navigator.share) await navigator.share({ text: texte });
              else {
                await navigator.clipboard.writeText(texte);
                signaler('Invitation copiée');
              }
            } catch {
              // Partage annulé par l'utilisateur.
            }
          }}
        >
          Partager mon code
        </button>
      </section>

      <div className="sous-soldes carte">
        <div><span>Amis parrainés</span><b>{etat.parrainages.length}</b></div>
        <div><span>Bonus acquis</span><b>{M.formatEuros(gagne)}</b></div>
      </div>

      <form
        className="carte formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (!prenom.trim()) return;
          if (modifier((s, t) => M.ajouterParrainage(s, prenom, t))) signaler(`${prenom.trim()} a rejoint Parnassa : bonus en attente`);
          setPrenom('');
        }}
      >
        <b>Simuler l'inscription d'un ami</b>
        <input className="champ" placeholder="Prénom de l'ami" value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={40} />
        <button className="bouton" disabled={!prenom.trim()}>Ajouter</button>
        <p className="discret">Le bonus devient disponible {M.DELAI_PARRAINAGE_JOURS} jours après l'ouverture du compte de votre ami.</p>
      </form>
    </>
  );
}
