import type { Contexte } from '../App';
import { avancement, defisDuMois, finMois, reclamerDefi } from '../defis';
import * as M from '../moteur';
import { BONUS_SERIE, PALIER_SERIE, recupererSerie, serie } from '../serie';

const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

export function Defis({ etat, t, modifier, signaler }: Contexte) {
  const liste = defisDuMois(t).map((d) => avancement(etat, d, t));
  const restant = Math.ceil((finMois(t) - t) / M.JOUR);
  const gagnes = etat.bonus.reduce((s, b) => s + b.montant, 0);
  const sr = serie(etat, t);
  const dansPalier = sr.semaines % PALIER_SERIE;
  const etapes = sr.semaines > 0 && dansPalier === 0 ? PALIER_SERIE : dansPalier;

  return (
    <>
      <h1>Défis {/^[aeiou]/.test(mois.format(t)) ? 'd’' : 'de '}{mois.format(t)}</h1>
      <p className="discret">
        Encore {restant} jour{restant > 1 ? 's' : ''} pour les relever. De nouveaux défis chaque mois.
        {gagnes > 0 && ` Vous avez déjà gagné ${M.formatEuros(gagnes)} en défis.`}
      </p>
      <section className="carte serie">
        <div className="ligne-titre">
          <span className="defi-icone" aria-hidden>{sr.semaines ? '🔥' : '🧊'}</span>
          <div className="offre-texte">
            <b>Série de {sr.semaines} semaine{sr.semaines > 1 ? 's' : ''}</b>
            <span className="discret">
              Un achat partenaire chaque semaine. Toutes les {PALIER_SERIE} semaines : +{M.formatEuros(BONUS_SERIE)}.
            </span>
          </div>
        </div>
        <div className="semaines" aria-label={`${etapes} sur ${PALIER_SERIE}`}>
          {Array.from({ length: PALIER_SERIE }, (_, i) => (
            <span key={i} className={i < etapes ? 'faite' : ''} />
          ))}
        </div>
        <div className="ligne-titre">
          <span className="discret">{sr.semaineFaite ? 'Cette semaine est validée ✓' : 'Pas encore d’achat partenaire cette semaine'}</span>
          {sr.aRecuperer > 0 && (
            <button className="puce active" onClick={() => modifier((e, tt) => recupererSerie(e, tt)) && signaler(`+${M.formatEuros(BONUS_SERIE * sr.aRecuperer)} de bonus de série`)}>
              Récupérer
            </button>
          )}
        </div>
      </section>

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
