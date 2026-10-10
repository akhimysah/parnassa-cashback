import { useState } from 'react';
import type { Contexte } from '../App';
import { CATEGORIES, MARCHANDS, type Categorie } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';

export function Offres({ etat, t, modifier, signaler }: Contexte) {
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<Categorie | 'Activées' | null>(null);
  const mult = M.palierActuel(etat, t).palier.multiplicateur;

  const q = recherche.trim().toLocaleLowerCase('fr');
  const liste = MARCHANDS.filter(
    (m) =>
      (!q || m.nom.toLocaleLowerCase('fr').includes(q) || m.accroche.toLocaleLowerCase('fr').includes(q)) &&
      (categorie === null || (categorie === 'Activées' ? etat.offresActivees.includes(m.id) : m.categorie === categorie)),
  ).sort((a, b) => b.taux - a.taux);

  return (
    <>
      <h1>Offres partenaires</h1>
      <input className="champ" type="search" placeholder="Rechercher un marchand" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      <div className="filtres">
        {([null, 'Activées', ...CATEGORIES] as const).map((c) => (
          <button key={c ?? 'tout'} className={`puce ${categorie === c ? 'active' : ''}`} onClick={() => setCategorie(c)}>
            {c ?? 'Tout'}
            {c === 'Activées' && ` (${etat.offresActivees.length})`}
          </button>
        ))}
      </div>
      <ul className="liste">
        {liste.map((m) => {
          const actif = etat.offresActivees.includes(m.id);
          return (
            <li key={m.id} className="offre">
              <Logo marchand={m} />
              <div className="offre-texte">
                <b>{m.nom}</b>
                <span className="discret">{m.accroche}</span>
                <span className="conditions">
                  {m.plafond !== undefined && `Plafond ${M.formatEuros(m.plafond)} · `}
                  Disponible après {m.delaiJours} j
                </span>
              </div>
              <div className="offre-action">
                <span className="taux">{M.formatTaux(m.taux * mult)}</span>
                <button
                  className={`puce ${actif ? 'active' : ''}`}
                  onClick={() => {
                    modifier((e) => M.basculerOffre(e, m.id));
                    signaler(actif ? `Offre ${m.nom} désactivée` : `Offre ${m.nom} activée`);
                  }}
                >
                  {actif ? '✓ Activée' : 'Activer'}
                </button>
              </div>
            </li>
          );
        })}
        {liste.length === 0 && <li className="vide">Aucune offre ne correspond.</li>}
      </ul>
    </>
  );
}
