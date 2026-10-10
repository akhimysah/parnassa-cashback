import { lazy, Suspense, useState } from 'react';
import type { Contexte } from '../App';
import { CATEGORIES, MARCHANDS, type Categorie } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';

type Filtre = Categorie | 'Activées' | 'Promos' | 'Favoris' | null;
type Tri = 'taux' | 'nom' | 'delai';

// La carte (Leaflet) n'est chargée qu'à la première ouverture de « Près de moi ».
const PresDeMoi = lazy(() => import('./PresDeMoi'));

export function Offres(ctx: Contexte) {
  const [vue, setVue] = useState<'en-ligne' | 'magasins'>('en-ligne');
  return (
    <>
      <h1>Offres partenaires</h1>
      <div className="segments" role="tablist">
        {(['en-ligne', 'magasins'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={vue === v} className={vue === v ? 'actif' : ''} onClick={() => setVue(v)}>
            {v === 'en-ligne' ? 'En ligne' : '📍 Près de moi'}
          </button>
        ))}
      </div>
      {vue === 'en-ligne' ? (
        <EnLigne {...ctx} />
      ) : (
        <Suspense fallback={<p className="vide">Chargement de la carte…</p>}>
          <PresDeMoi {...ctx} />
        </Suspense>
      )}
    </>
  );
}

function EnLigne({ etat, t, modifier, signaler, ouvrirMarchand, ouvrirSimulateur, ouvrirCalendrier }: Contexte) {
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
      <div className="duo">
        <button className="carte tuile" onClick={ouvrirSimulateur}>
          <span className="tuile-icone" aria-hidden>🧮</span>
          <b className="tuile-titre">Combien puis-je gagner ?</b>
          <span className="petit-texte">Estimation sur un an</span>
        </button>
        <button className="carte tuile" onClick={ouvrirCalendrier}>
          <span className="tuile-icone" aria-hidden>📅</span>
          <b className="tuile-titre">Calendrier des promos</b>
          <span className="petit-texte">Flashs et boosts à venir</span>
        </button>
      </div>
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
