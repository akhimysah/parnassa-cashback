import { useEffect, useRef, useState } from 'react';
import type { Contexte } from '../App';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { bilanMarchand } from '../statistiques';
import { Logo } from './Logo';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function FicheMarchand({ id, fermer, etat, t, modifier, signaler }: Contexte & { id: string; fermer: () => void }) {
  const m = trouverMarchand(id)!;
  const dialogue = useRef<HTMLDialogElement>(null);
  const [saisie, setSaisie] = useState('');
  const actif = etat.offresActivees.includes(m.id);
  const booste = M.boostsDeLaSemaine(t).includes(m.id);
  const { palier } = M.palierActuel(etat, t);
  const bilan = bilanMarchand(etat, m.id);
  const montant = M.lireMontant(saisie);
  const apercu = montant ? M.calculerCashback(etat, m.id, montant, t) : 0;

  useEffect(() => {
    dialogue.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogue} className="fiche" onClose={fermer} onClick={(e) => e.target === dialogue.current && dialogue.current.close()}>
      <div className="fiche-corps" style={{ ['--teinte' as string]: m.couleur }}>
        <button className="fermer" onClick={() => dialogue.current?.close()} aria-label="Fermer">×</button>
        <header className="fiche-entete">
          <Logo marchand={m} taille={64} />
          <div>
            <h2>{m.nom}</h2>
            <span className="discret">{m.categorie} · {m.accroche}</span>
          </div>
        </header>

        <div className="fiche-taux">
          <span className="taux grand">{M.formatTaux(M.tauxMarchand(m.id, t) * palier.multiplicateur)}</span>
          <span className="discret">
            de cashback
            {palier.multiplicateur > 1 && ` (palier ${palier.nom} ×${palier.multiplicateur.toLocaleString('fr-FR')})`}
          </span>
          {booste && <p className="bandeau-boost">⚡ Boost ×{M.COEF_BOOST.toLocaleString('fr-FR')} jusqu'au {jour.format(M.finDeSemaine(t) - 1)}</p>}
        </div>

        <table className="paliers">
          <tbody>
            {M.PALIERS.map((p) => (
              <tr key={p.nom} className={p.nom === palier.nom ? 'courant' : ''}>
                <td>{p.nom}</td>
                <td>{M.formatTaux(M.tauxMarchand(m.id, t) * p.multiplicateur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="conditions-liste">
          <li>Cashback disponible {m.delaiJours} jours après l'achat (délai de rétractation).</li>
          {m.plafond !== undefined && <li>Plafonné à {M.formatEuros(m.plafond)} de cashback par achat.</li>}
          <li>Payez avec votre carte Parnassa après avoir activé l'offre.</li>
        </ul>

        {bilan.achats > 0 && (
          <p className="discret">
            Déjà {bilan.achats} achat{bilan.achats > 1 ? 's' : ''} ici : {M.formatEuros(bilan.cashback)} gagnés sur {M.formatEuros(bilan.depense)}.
          </p>
        )}

        <button className={`bouton ${actif ? 'secondaire' : ''}`} onClick={() => modifier((e) => M.basculerOffre(e, m.id))}>
          {actif ? '✓ Offre activée — désactiver' : "Activer l'offre"}
        </button>

        {actif && (
          <form
            className="rangee"
            onSubmit={(e) => {
              e.preventDefault();
              if (!montant) return;
              if (modifier((s, tt) => M.enregistrerAchat(s, m.id, montant, tt))) signaler(`+${M.formatEuros(apercu)} de cashback en attente`);
              setSaisie('');
            }}
          >
            <input className="champ" inputMode="decimal" placeholder="Montant en €" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Montant de l'achat" />
            <button className="bouton" disabled={!montant} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
              Payer{montant ? ` · +${M.formatEuros(apercu)}` : ''}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
