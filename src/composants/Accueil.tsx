import type { Contexte } from '../App';
import { MARCHANDS } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';
import { avancement, defisDuMois } from '../defis';

export function Accueil({ etat, t, modifier, aller, signaler, ouvrirMarchand }: Contexte) {
  const s = M.soldes(etat);
  const { palier, suivant, progression } = M.palierActuel(etat, t);
  const depenses = M.depenses12Mois(etat, t);
  const boosts = M.boostsDeLaSemaine(t);
  const aLaUne = [...MARCHANDS.filter((m) => boosts.includes(m.id)), ...MARCHANDS.filter((m) => m.aLaUne && !boosts.includes(m.id))];
  const defis = defisDuMois(t).map((d) => avancement(etat, d, t));
  const aRecuperer = defis.filter((a) => a.reussi && !a.reclame).length;
  const finis = defis.filter((a) => a.reclame).length;
  const peutVerser = s.disponible >= M.VERSEMENT_MINIMUM;

  return (
    <>
      <section className="heros">
        <header className="entete">
          <span className="marque">Parnassa <b>Cashback</b></span>
          <span className={`badge-palier ${palier.nom.toLowerCase()}`}>{palier.nom} · ×{palier.multiplicateur}</span>
        </header>
        <p className="etiquette">Disponible</p>
        <p className="solde">{M.formatEuros(s.disponible)}</p>
        <div className="sous-soldes">
          <div><span>En attente</span><b>{M.formatEuros(s.enAttente)}</b></div>
          <div><span>Déjà versé</span><b>{M.formatEuros(s.verse)}</b></div>
        </div>
        <button
          className="bouton blanc"
          disabled={!peutVerser}
          onClick={() => {
            if (modifier(M.verser)) signaler(`${M.formatEuros(s.disponible)} versés sur votre compte Parnassa`);
          }}
        >
          {peutVerser ? 'Verser sur mon compte' : `Versement dès ${M.formatEuros(M.VERSEMENT_MINIMUM)}`}
        </button>
      </section>

      <section className="carte">
        <div className="ligne-titre">
          <h2>Palier {palier.nom}</h2>
          <span className="discret">{M.formatEuros(depenses)} dépensés sur 12 mois</span>
        </div>
        <div className="jauge"><div style={{ width: `${Math.min(100, progression * 100)}%` }} /></div>
        <p className="discret">
          {suivant
            ? `Encore ${M.formatEuros(suivant.seuil - depenses)} pour passer ${suivant.nom} et gagner ×${suivant.multiplicateur} sur tout votre cashback.`
            : 'Palier maximum atteint : votre cashback est doublé.'}
        </p>
      </section>

      <section>
        <div className="ligne-titre">
          <h2>À la une</h2>
          <button className="lien" onClick={() => aller('offres')}>Tout voir</button>
        </div>
        <div className="defile">
          {aLaUne.map((m) => {
            const actif = etat.offresActivees.includes(m.id);
            return (
              <article key={m.id} className={`vignette ${boosts.includes(m.id) ? 'boostee' : ''}`} style={{ ['--teinte' as string]: m.couleur }}>
                {boosts.includes(m.id) && <span className="pastille-boost">⚡ Boost</span>}
                <button className="vignette-ouvrir" onClick={() => ouvrirMarchand(m.id)} aria-label={`Détails de l'offre ${m.nom}`}>
                  <Logo marchand={m} />
                  <b>{m.nom}</b>
                </button>
                <span className="taux">{M.formatTaux(M.tauxMarchand(m.id, t) * palier.multiplicateur)}</span>
                <button className={`puce ${actif ? 'active' : ''}`} onClick={() => modifier((e) => M.basculerOffre(e, m.id))}>
                  {actif ? '✓ Activée' : 'Activer'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <button className="carte resume-defis" onClick={() => aller('defis')} aria-label="Voir les défis du mois">
        <span className="defi-icone" aria-hidden>★</span>
        <span className="offre-texte">
          <b>Défis du mois</b>
          <span className="discret">
            {aRecuperer > 0 ? `${aRecuperer} récompense${aRecuperer > 1 ? 's' : ''} à récupérer !` : `${finis} / ${defis.length} réussis`}
          </span>
        </span>
        <span aria-hidden>›</span>
      </button>

      <section className="carte astuce">
        <b>Comment ça marche ?</b>
        <ol>
          <li>Activez une offre partenaire.</li>
          <li>Payez avec votre carte Parnassa.</li>
          <li>Le cashback est en attente pendant le délai de rétractation, puis devient disponible.</li>
        </ol>
        <p className="discret">Hors partenaires : {M.formatTaux(M.TAUX_BASE)} sur tous vos paiements par carte.</p>
      </section>

      <section className="carte demo">
        <b>Mode démonstration</b>
        <p className="discret">Faites avancer l'horloge pour voir le cashback se débloquer.</p>
        <div className="rangee">
          <button className="bouton secondaire" onClick={() => modifier((e) => M.avancerTemps(e, 7))}>+7 jours</button>
          <button className="bouton secondaire" onClick={() => modifier((e) => M.avancerTemps(e, 30))}>+30 jours</button>
          <button
            className="bouton secondaire"
            onClick={() => {
              if (confirm('Effacer toutes les données de démonstration ?')) modifier(() => M.etatInitial());
            }}
          >
            Réinitialiser
          </button>
        </div>
      </section>
    </>
  );
}
