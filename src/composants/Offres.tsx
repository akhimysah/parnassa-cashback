import { useState } from 'react';
import type { Contexte } from '../App';
import { CATEGORIES, MARCHANDS, type Categorie } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';

type Filtre = Categorie | 'Activées' | 'Promos' | 'Favoris' | null;
type Tri = 'taux' | 'nom' | 'delai';

export function Offres({ etat, t, modifier, signaler, ouvrirMarchand, ouvrirSimulateur }: Contexte) {
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>(null);
  const [tri, setTri] = useState<Tri>('taux');
  const mult = M.palierActuel(etat, t).palier.multiplicateur;
  const boosts = M.boostsDeLaSemaine(t);
  const flash = M.offreFlash(t);

  const q = recherche.trim().toLocaleLowerCase('fr');
  const garde = (id: string, categorie: Categorie) =>
    filtre === null ||
    (filtre === 'Activées'
      ? etat.offresActivees.includes(id)
      : filtre === 'Promos'
        ? boosts.includes(id) || flash.marchandId === id
        : filtre === 'Favoris'
          ? etat.favoris.includes(id)
          : categorie === filtre);
  const liste = MARCHANDS.filter(
    (m) => (!q || m.nom.toLocaleLowerCase('fr').includes(q) || m.accroche.toLocaleLowerCase('fr').includes(q)) && garde(m.id, m.categorie),
  ).sort((a, b) =>
    tri === 'nom' ? a.nom.localeCompare(b.nom, 'fr') : tri === 'delai' ? a.delaiJours - b.delaiJours : M.tauxMarchand(b.id, t) - M.tauxMarchand(a.id, t),
  );

  return (
    <>
      <h1>Offres partenaires</h1>
      <button className="carte resume-defis simulateur-entree" onClick={ouvrirSimulateur}>
        <span className="defi-icone" aria-hidden>🧮</span>
        <span className="offre-texte">
          <b>Combien puis-je gagner ?</b>
          <span className="discret">Estimez votre cashback sur un an</span>
        </span>
        <span aria-hidden>›</span>
      </button>
      <div className="rangee">
        <input className="champ" type="search" placeholder="Rechercher un marchand" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un marchand" />
        <select className="champ tri" value={tri} onChange={(e) => setTri(e.target.value as Tri)} aria-label="Trier">
          <option value="taux">Meilleur taux</option>
          <option value="nom">A → Z</option>
          <option value="delai">Plus rapide</option>
        </select>
      </div>
      <div className="filtres">
        {([null, 'Promos', 'Favoris', 'Activées', ...CATEGORIES] as const).map((c) => (
          <button key={c ?? 'tout'} className={`puce ${filtre === c ? 'active' : ''}`} onClick={() => setFiltre(c)}>
            {c === 'Promos' && '⚡ '}
            {c === 'Favoris' && '♥ '}
            {c ?? 'Tout'}
            {c === 'Activées' && ` (${etat.offresActivees.length})`}
          </button>
        ))}
      </div>
      <ul className="liste">
        {liste.map((m) => {
          const actif = etat.offresActivees.includes(m.id);
          const enFlash = flash.marchandId === m.id;
          const booste = boosts.includes(m.id) || enFlash;
          return (
            <li key={m.id} className={`offre ${booste ? 'boostee' : ''}`}>
              <button className="offre-ouvrir" onClick={() => ouvrirMarchand(m.id)} aria-label={`Détails de l'offre ${m.nom}`}>
                <Logo marchand={m} />
                <div className="offre-texte">
                  <b>{etat.favoris.includes(m.id) && <span className="coeur-mini" aria-label="Favori">♥ </span>}{m.nom}</b>
                  <span className="discret">{m.accroche}</span>
                  <span className="conditions">
                    {enFlash && <span className="eclair">⏱️ Flash ×{M.COEF_FLASH} aujourd'hui · </span>}
                    {booste && !enFlash && <span className="eclair">⚡ Boost ×{M.COEF_BOOST.toLocaleString('fr-FR')} · </span>}
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
