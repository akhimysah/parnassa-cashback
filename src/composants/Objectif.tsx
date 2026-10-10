import { useState } from 'react';
import type { Contexte } from '../App';
import { cleMois, finMois } from '../defis';
import * as M from '../moteur';
import { gainsDu } from '../recap';

const CHOIX = [1000, 2000, 5000, 10_000];

/** Objectif de cashback du mois, avec projection au rythme actuel. */
export function Objectif({ etat, t, modifier, signaler }: Contexte) {
  const objectif = etat.reglages.objectifMensuel;
  const [edition, setEdition] = useState(false);
  const gagne = gainsDu(etat, cleMois(t));
  const d = new Date(t);
  const jourDuMois = d.getDate();
  const joursDansMois = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const projection = Math.round((gagne / jourDuMois) * joursDansMois);
  const restantJours = Math.ceil((finMois(t) - t) / M.JOUR);

  if (objectif === null || edition) {
    return (
      <section className="carte">
        <div className="ligne-titre">
          <h2>🎯 Objectif du mois</h2>
          {edition && <button className="lien petit" onClick={() => setEdition(false)}>Annuler</button>}
        </div>
        <p className="discret">Combien voulez-vous récupérer ce mois-ci ?</p>
        <div className="filtres">
          {CHOIX.map((c) => (
            <button
              key={c}
              className={`puce ${objectif === c ? 'active' : ''}`}
              onClick={() => {
                if (modifier((e) => M.regler(e, { objectifMensuel: c }))) signaler(`Objectif : ${M.formatEuros(c)} par mois`);
                setEdition(false);
              }}
            >
              {M.formatEuros(c).replace(/,00/, '')}
            </button>
          ))}
          {objectif !== null && (
            <button className="puce" onClick={() => { modifier((e) => M.regler(e, { objectifMensuel: null })); setEdition(false); }}>
              Aucun
            </button>
          )}
        </div>
      </section>
    );
  }

  const progression = Math.min(1, gagne / objectif);
  const atteint = gagne >= objectif;
  return (
    <section className={`carte objectif ${atteint ? 'atteint' : ''}`}>
      <div className="ligne-titre">
        <h2>🎯 {M.formatEuros(gagne)} <span className="discret">/ {M.formatEuros(objectif).replace(/,00/, '')}</span></h2>
        <button className="lien petit" onClick={() => setEdition(true)}>Modifier</button>
      </div>
      <div className="jauge"><div style={{ width: `${progression * 100}%` }} /></div>
      <p className="discret">
        {atteint
          ? 'Objectif du mois atteint 🎉'
          : projection >= objectif
            ? `Au rythme actuel : ~${M.formatEuros(projection)} fin du mois. En bonne voie !`
            : `Encore ${M.formatEuros(objectif - gagne)} en ${restantJours} jour${restantJours > 1 ? 's' : ''}.`}
      </p>
    </section>
  );
}
