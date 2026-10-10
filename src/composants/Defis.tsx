import type { Contexte } from '../App';
import { avancement, defisDuMois, finMois, reclamerDefi } from '../defis';
import * as M from '../moteur';

const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

export function Defis({ etat, t, modifier, signaler }: Contexte) {
  const liste = defisDuMois(t).map((d) => avancement(etat, d, t));
  const restant = Math.ceil((finMois(t) - t) / M.JOUR);
  const gagnes = etat.bonus.reduce((s, b) => s + b.montant, 0);

  return (
    <>
      <h1>Défis {/^[aeiou]/.test(mois.format(t)) ? 'd’' : 'de '}{mois.format(t)}</h1>
      <p className="discret">
        Encore {restant} jour{restant > 1 ? 's' : ''} pour les relever. De nouveaux défis chaque mois.
        {gagnes > 0 && ` Vous avez déjà gagné ${M.formatEuros(gagnes)} en défis.`}
      </p>
      <ul className="liste">
        {liste.map((a) => {
          const valeur = (x: number) => (a.defi.condition.type === 'depense-partenaires' ? M.formatEuros(x) : String(x));
          return (
            <li key={a.defi.id} className={`carte defi ${a.reclame ? 'termine' : ''}`}>
              <div className="ligne-titre">
                <span className="defi-icone" aria-hidden>{a.defi.icone}</span>
                <div className="offre-texte">
                  <b>{a.defi.titre}</b>
                  <span className="discret">{a.defi.description}</span>
                </div>
                <span className="montant">+{M.formatEuros(a.defi.recompense)}</span>
              </div>
              <div className="jauge"><div style={{ width: `${(a.fait / a.objectif) * 100}%` }} /></div>
              <div className="ligne-titre">
                <span className="discret">{valeur(a.fait)} / {valeur(a.objectif)}</span>
                {a.reclame ? (
                  <span className="statut disponible">Récompense obtenue</span>
                ) : (
                  <button
                    className="puce active"
                    disabled={!a.reussi}
                    onClick={() => {
                      if (modifier((e, tt) => reclamerDefi(e, a.defi.id, tt))) signaler(`+${M.formatEuros(a.defi.recompense)} ajoutés à votre solde`);
                    }}
                  >
                    {a.reussi ? 'Récupérer' : 'En cours'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
