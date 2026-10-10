import type { Contexte } from '../App';
import { classement } from '../classement';
import * as M from '../moteur';

const MEDAILLES = ['🥇', '🥈', '🥉'];

export function Classement({ etat, t, aller }: Contexte) {
  const liste = classement(etat, t);
  const rang = liste.findIndex((p) => p.moi) + 1;
  const devant = liste[rang - 2];
  return (
    <>
      <section className="carte classement-entete">
        <span className="classement-rang">{rang <= 3 ? MEDAILLES[rang - 1] : `${rang}e`}</span>
        <div className="offre-texte">
          <b>{rang === 1 ? 'Vous menez le classement !' : `Vous êtes ${rang}e sur ${liste.length}`}</b>
          <span className="discret">{devant ? `Encore ${M.formatEuros(devant.gains - liste[rang - 1].gains + 1)} pour dépasser ${devant.nom}` : 'Gardez la tête jusqu’à la fin du mois.'}</span>
        </div>
      </section>
      <ol className="liste classement">
        {liste.map((p, i) => (
          <li key={p.nom} className={`operation ${p.moi ? 'moi' : ''}`}>
            <span className="classement-position">{i < 3 ? MEDAILLES[i] : i + 1}</span>
            <span className="avatar" aria-hidden>{p.nom[0]}</span>
            <b className="offre-texte">{p.nom}</b>
            <span className="montant">{M.formatEuros(p.gains)}</span>
          </li>
        ))}
      </ol>
      <p className="petit-texte">
        Cashback et bonus gagnés ce mois-ci. Vos filleuls y apparaissent ; Camille, Yanis, Inès et Hugo sont des amis de démonstration.{' '}
        <button className="lien petit" onClick={() => aller('profil', 'parrainage')}>Inviter des amis</button>
      </p>
    </>
  );
}
