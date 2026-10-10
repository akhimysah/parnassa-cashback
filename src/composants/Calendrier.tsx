import type { Contexte } from '../App';
import { boostsAVenir, flashsAVenir } from '../calendrier';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { Feuille } from './Feuille';
import { Logo } from './Logo';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const court = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export function Calendrier({ fermer, etat, t, ouvrirMarchand }: Contexte & { fermer: () => void }) {
  const mult = M.palierActuel(etat, t).palier.multiplicateur;
  const flashs = flashsAVenir(t, 7);
  const semaines = boostsAVenir(t, 4);
  return (
    <Feuille fermer={fermer} titre="Calendrier des promos">
      <h3 className="sous-titre">⏱️ Offres flash — ×{M.COEF_FLASH} pendant 24 h</h3>
      <ul className="liste calendrier">
        {flashs.map((f, i) => {
          const m = trouverMarchand(f.marchandId)!;
          return (
            <li key={f.debut}>
              <button className={`entree ${i === 0 ? 'aujourdhui' : ''}`} onClick={() => ouvrirMarchand(m.id)}>
                <span className="calendrier-jour">{i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : jour.format(f.debut)}</span>
                <Logo marchand={m} taille={32} />
                <span className="offre-texte"><b>{m.nom}</b></span>
                <span className="taux">{M.formatTaux(f.taux * mult)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="sous-titre">⚡ Boosts — ×{M.COEF_BOOST.toLocaleString('fr-FR')} toute la semaine</h3>
      <ul className="liste calendrier">
        {semaines.map((s, i) => (
          <li key={s.debut} className="carte semaine-boost">
            <span className="petit-texte">{i === 0 ? 'Cette semaine' : `Du ${court.format(s.debut)} au ${court.format(s.fin - 1)}`}</span>
            <div className="rangee">
              {s.marchandIds.map((id) => {
                const m = trouverMarchand(id)!;
                return (
                  <button key={id} className="mini-marchand" onClick={() => ouvrirMarchand(id)}>
                    <Logo marchand={m} taille={32} />
                    <span>{m.nom}</span>
                    <b className="taux petit">{M.formatTaux(m.taux * M.COEF_BOOST * mult)}</b>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="petit-texte">Les promos sont tirées à l'avance : planifiez vos achats pour en profiter.</p>
    </Feuille>
  );
}
