import type { Contexte } from '../App';
import { SUCCES } from '../succes';
import * as M from '../moteur';

const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function Succes({ etat, t }: Contexte) {
  const obtenus = SUCCES.filter((s) => s.id in etat.succes).length;
  // Débloqués d'abord (les plus récents en tête), puis les plus avancés.
  const liste = SUCCES.map((s) => {
    const [fait, objectif] = s.mesure(etat, t);
    return { s, fait, objectif, quand: etat.succes[s.id] };
  }).sort((a, b) => (b.quand ?? -1) - (a.quand ?? -1) || b.fait / b.objectif - a.fait / a.objectif);

  return (
    <>
      <p className="discret">{obtenus} / {SUCCES.length} succès débloqués</p>
      <div className="jauge"><div style={{ width: `${(obtenus / SUCCES.length) * 100}%` }} /></div>
      <ul className="grille-succes">
        {liste.map(({ s, fait, objectif, quand }) => {
          const argent = ['dix-euros', 'cent-euros', 'epargnant', 'mecene'].includes(s.id);
          const valeur = (x: number) => (argent ? M.formatEuros(x).replace(/,00/, '') : String(x));
          return (
            <li key={s.id} className={`badge ${quand ? 'obtenu' : ''}`} title={s.description}>
              <span className="badge-icone" aria-hidden>{s.icone}</span>
              <b>{s.titre}</b>
              <span className="petit-texte">{s.description}</span>
              {quand ? (
                <span className="petit-texte">✓ {date.format(quand)}</span>
              ) : (
                <>
                  <span className="jauge fine"><span style={{ width: `${Math.min(1, fait / objectif) * 100}%` }} /></span>
                  <span className="petit-texte">{valeur(Math.min(fait, objectif))} / {valeur(objectif)}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
