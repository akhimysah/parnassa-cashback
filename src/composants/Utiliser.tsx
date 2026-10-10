import { useState } from 'react';
import type { Contexte } from '../App';
import { MARCHANDS } from '../marchands';
import * as M from '../moteur';
import { MONTANTS_CARTE, acheterCarte, valeurCarte } from '../cartes';
import { Feuille } from './Feuille';
import { ASSOCIATIONS, TAUX_REDUCTION, trouverAssociation } from '../associations';
import { Logo } from './Logo';

type Choix = 'compte' | 'coffre' | 'carte' | 'don';

/** « Utiliser mon cashback » : versement sur le compte, mise de côté dans le coffre ou carte cadeau. */
export function Utiliser({ fermer, etat, t, modifier, signaler, aller }: Contexte & { fermer: () => void }) {
  const { disponible } = M.soldes(etat);
  const avecCarte = MARCHANDS.filter((m) => m.bonusCarte).sort((a, b) => b.bonusCarte! - a.bonusCarte!);
  const [choix, setChoix] = useState<Choix>('compte');
  const [marchandId, setMarchandId] = useState(avecCarte[0].id);
  const [saisie, setSaisie] = useState('');

  const [montantCarte, setMontantCarte] = useState(MONTANTS_CARTE[0]);
  const [associationId, setAssociationId] = useState(ASSOCIATIONS[0].id);
  const montantCoffre = saisie ? M.lireMontant(saisie) : disponible;


  const valider = () => {
    if (choix === 'compte') {
      if (modifier((e, tt) => M.verser(e, tt, 'compte'))) {
        signaler(`${M.formatEuros(disponible)} versés sur votre compte Parnassa`);
        fermer();
      }
    } else if (choix === 'coffre') {
      if (montantCoffre && modifier((e, tt) => M.verser(e, tt, 'coffre', montantCoffre))) {
        signaler(`${M.formatEuros(montantCoffre)} mis de côté dans « ${etat.coffre.nom} »`);
        fermer();
      }
    } else if (choix === 'don') {
      if (montantCoffre && modifier((e, tt) => M.donner(e, associationId, montantCoffre, tt))) {
        signaler(`Merci ! ${M.formatEuros(montantCoffre)} donnés à ${trouverAssociation(associationId)?.nom}`);
        fermer();
      }
    } else if (modifier((e, tt) => acheterCarte(e, marchandId, montantCarte, tt))) {
      signaler(`Carte cadeau de ${M.formatEuros(valeurCarte(marchandId, montantCarte))} créée`);
      aller('profil', 'cartes');
      fermer();
    }
  };

  return (
    <Feuille fermer={fermer} titre="Utiliser mon cashback">
      <p className="discret">Disponible : <b>{M.formatEuros(disponible)}</b></p>
      <div className="choix" role="radiogroup">
        {(
          [
            ['compte', '🏦', 'Compte Parnassa', `Dès ${M.formatEuros(M.VERSEMENT_MINIMUM)}`],
            ['coffre', '🐷', etat.coffre.nom, `${M.formatEuros(M.soldeCoffre(etat))} épargnés`],
            ['carte', '🎁', 'Carte cadeau', `Jusqu'à +${avecCarte[0].bonusCarte} %`],
            ['don', '💝', 'Faire un don', `${ASSOCIATIONS.length} associations`],
          ] as const
        ).map(([id, icone, titre, sous]) => (
          <button key={id} role="radio" aria-checked={choix === id} aria-label={`${titre} : ${sous}`} className={`choix-option ${choix === id ? 'actif' : ''}`} onClick={() => setChoix(id)}>
            <span aria-hidden>{icone}</span>
            <b>{titre}</b>
            <span className="discret">{sous}</span>
          </button>
        ))}
      </div>

      {choix === 'don' && (
        <div className="defile cartes-marchands">
          {ASSOCIATIONS.map((a) => (
            <button key={a.id} className={`mini-marchand ${associationId === a.id ? 'actif' : ''}`} onClick={() => setAssociationId(a.id)} aria-pressed={associationId === a.id}>
              <span className="logo" style={{ width: 36, height: 36, background: a.couleur, fontSize: 18 }}>{a.icone}</span>
              <span>{a.nom}</span>
              <span className="petit-texte">{a.cause}</span>
            </button>
          ))}
        </div>
      )}

      {(choix === 'coffre' || choix === 'don') && (
        <input
          className="champ"
          inputMode="decimal"
          placeholder={`Montant (tout : ${M.formatEuros(disponible)})`}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          aria-invalid={saisie !== '' && !M.lireMontant(saisie)}
          aria-label={choix === 'don' ? 'Montant du don' : 'Montant à mettre de côté'}
        />
      )}

      {choix === 'carte' && (
        <>
          <div className="defile cartes-marchands">
            {avecCarte.map((m) => (
              <button key={m.id} className={`mini-marchand ${marchandId === m.id ? 'actif' : ''}`} onClick={() => setMarchandId(m.id)} aria-pressed={marchandId === m.id}>
                <Logo marchand={m} taille={36} />
                <span>{m.nom}</span>
                <b className="taux petit">+{m.bonusCarte} %</b>
              </button>
            ))}
          </div>
          <div className="filtres">
            {MONTANTS_CARTE.map((x) => (
              <button key={x} className={`puce ${montantCarte === x ? 'active' : ''}`} onClick={() => setMontantCarte(x)} disabled={x > disponible}>
                {M.formatEuros(x)}
              </button>
            ))}
          </div>
          <p className="recap-carte">
            {M.formatEuros(montantCarte)} de cashback → <b>{M.formatEuros(valeurCarte(marchandId, montantCarte))}</b> à dépenser
          </p>
        </>
      )}

      {choix === 'don' && montantCoffre ? (
        <p className="petit-texte">
          Si l'association est d'intérêt général, ce don ouvre droit à une réduction d'impôt de {TAUX_REDUCTION * 100} % : il ne vous coûterait que {M.formatEuros(Math.round(montantCoffre * (1 - TAUX_REDUCTION)))}. (Associations fictives de démonstration.)
        </p>
      ) : null}

      <button
        className="bouton"
        onClick={valider}
        disabled={
          (choix === 'compte' && disponible < M.VERSEMENT_MINIMUM) ||
          ((choix === 'coffre' || choix === 'don') && (!montantCoffre || montantCoffre > disponible)) ||
          (choix === 'carte' && montantCarte > disponible)
        }
      >
        {choix === 'compte' && `Verser ${M.formatEuros(disponible)}`}
        {choix === 'coffre' && `Mettre de côté ${montantCoffre ? M.formatEuros(montantCoffre) : ''}`}
        {choix === 'carte' && 'Créer la carte cadeau'}
        {choix === 'don' && `Donner ${montantCoffre ? M.formatEuros(montantCoffre) : ''}`}
      </button>
    </Feuille>
  );
}
