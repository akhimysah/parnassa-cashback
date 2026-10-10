import { useState } from 'react';
import { MARCHANDS } from '../marchands';
import { PALIERS, TAUX_BASE, formatTaux } from '../moteur';

const ETAPES = [
  {
    icone: '💸',
    titre: 'Faites-vous rembourser vos achats',
    texte: `Jusqu'à ${formatTaux(Math.max(...MARCHANDS.map((m) => m.taux)))} chez ${MARCHANDS.length} marchands partenaires, et ${formatTaux(TAUX_BASE)} partout ailleurs avec votre carte Parnassa.`,
  },
  {
    icone: '✦',
    titre: 'Activez, payez, encaissez',
    texte: "Activez une offre, payez avec votre carte : le cashback arrive en attente puis devient disponible après le délai de rétractation.",
  },
  {
    icone: '🏆',
    titre: 'Montez en palier',
    texte: `Défis du mois, boosts chaque semaine et paliers jusqu'à ×${PALIERS[PALIERS.length - 1].multiplicateur} : plus vous l'utilisez, plus il rapporte.`,
  },
];

export function Bienvenue({ terminer }: { terminer: () => void }) {
  const [i, setI] = useState(0);
  const etape = ETAPES[i];
  const derniere = i === ETAPES.length - 1;
  return (
    <div className="bienvenue" role="dialog" aria-modal="true" aria-labelledby="bienvenue-titre">
      <button className="lien passer" onClick={terminer}>Passer</button>
      <div className="bienvenue-corps" key={i}>
        <span className="bienvenue-icone" aria-hidden>{etape.icone}</span>
        <h1 id="bienvenue-titre">{etape.titre}</h1>
        <p>{etape.texte}</p>
      </div>
      <div className="points" aria-hidden>
        {ETAPES.map((_, j) => <span key={j} className={j === i ? 'actif' : ''} />)}
      </div>
      <button className="bouton blanc" onClick={() => (derniere ? terminer() : setI(i + 1))}>
        {derniere ? 'Commencer' : 'Suivant'}
      </button>
    </div>
  );
}
