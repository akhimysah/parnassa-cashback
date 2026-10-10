import { useState } from 'react';
import type { Contexte } from '../App';
import { CATEGORIES, MARCHANDS, type Categorie } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';

type Filtre = Categorie | 'Activées' | 'Boostées' | null;

export function Offres({ etat, t, modifier, signaler, ouvrirMarchand }: Contexte) {
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>(null);
  const mult = M.palierActuel(etat, t).palier.multiplicateur;
  const boosts = M.boostsDeLaSemaine(t);

  const q = recherche.trim().toLocaleLowerCase('fr');
  const garde = (id: string, categorie: Categorie) =>
    filtre === null ||
    (filtre === 'Activées' ? etat.offresActivees.includes(id) : filtre === 'Boostées' ? boosts.includes(id) : categorie === filtre);
  const liste = MARCHANDS.filter(
    (m) => (!q || m.nom.toLocaleLowerCase('fr').includes(q) || m.accroche.toLocaleLowerCase('fr').includes(q)) && garde(m.id, m.categorie),
  ).sort((a, b) => M.tauxMarchand(b.id, t) - M.tauxMarchand(a.id, t));

  return (
    <>
      <h1>Offres partenaires</h1>
      <input className="champ" type="search" placeholder="Rechercher un marchand" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      <div className="filtres">
        {([null, 'Boostées', 'Activées', ...CATEGORIES] as const).map((c) => (
          <button key={c ?? 'tout'} className={`puce ${filtre === c ? 'active' : ''}`} onClick={() => setFiltre(c)}>
            {c === 'Boostées' && '⚡ '}
            {c ?? 'Tout'}
            {c === 'Activées' && ` (${etat.offresActivees.length})`}
          </button>
        ))}
      </div>
      <ul className="liste">
        {liste.map((m) => {
          const actif = etat.offresActivees.includes(m.id);
          const booste = boosts.includes(m.id);
          return (
            <li key={m.id} className={`offre ${booste ? 'boostee' : ''}`}>
              <button className="offre-ouvrir" onClick={() => ouvrirMarchand(m.id)} aria-label={`Détails de l'offre ${m.nom}`}>
                <Logo marchand={m} />
                <div className="offre-texte">
                  <b>{m.nom}</b>
                  <span className="discret">{m.accroche}</span>
                  <span className="conditions">
                    {booste && <span className="eclair">⚡ Boost ×{M.COEF_BOOST.toLocaleString('fr-FR')} · </span>}
                    {m.plafond !== undefined && `Plafond ${M.formatEuros(m.plafond)} · `}
                    Disponible après {m.delaiJours} j
                  </span>
                </div>
              </button>
              <div className="offre-action">
                <span className="taux">
                  {booste && <s className="ancien">{M.formatTaux(m.taux * mult)}</s>}
                  {M.formatTaux(M.tauxMarchand(m.id, t) * mult)}
                </span>
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
