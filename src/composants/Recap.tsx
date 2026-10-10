import { useState } from 'react';
import type { Contexte } from '../App';
import { cleMois } from '../defis';
import * as M from '../moteur';
import { moisActifs, recapMois } from '../recap';
import { Feuille } from './Feuille';

export function Recap({ cle, fermer, etat, t, signaler }: Contexte & { cle?: string; fermer: () => void }) {
  const mois = moisActifs(etat);
  const [courant, setCourant] = useState(cle ?? mois[0] ?? cleMois(t));
  const i = mois.indexOf(courant);
  const r = recapMois(etat, courant);

  const partager = async () => {
    const texte =
      `Mon mois de ${r.libelle} avec Parnassa Cashback : ${M.formatEuros(r.gagne)} récupérés sur ${r.achats} achat${r.achats > 1 ? 's' : ''}` +
      (r.meilleurMarchand ? `, surtout chez ${r.meilleurMarchand.nom}` : '') +
      `. Rejoins-moi avec le code ${etat.codeParrainage} !`;
    try {
      if (navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        signaler('Récap copié');
      }
    } catch {
      // Partage annulé.
    }
  };

  return (
    <Feuille fermer={fermer} titre="Mon récap">
      <div className="recap-nav">
        <button className="puce" disabled={i < 0 || i >= mois.length - 1} onClick={() => setCourant(mois[i + 1])} aria-label="Mois précédent">‹</button>
        <b className="recap-mois">{r.libelle}</b>
        <button className="puce" disabled={i <= 0} onClick={() => setCourant(mois[i - 1])} aria-label="Mois suivant">›</button>
      </div>

      <section className="recap-carte">
        <span className="etiquette">Cashback et bonus</span>
        <span className="recap-total">{M.formatEuros(r.gagne)}</span>
        {r.evolution !== null && (
          <span className={`recap-evolution ${r.evolution >= 0 ? 'hausse' : 'baisse'}`}>
            {r.evolution >= 0 ? '▲' : '▼'} {Math.abs(r.evolution)} % par rapport au mois précédent
          </span>
        )}
        <div className="recap-grille">
          <div><b>{r.achats}</b><span>achat{r.achats > 1 ? 's' : ''}</span></div>
          <div><b>{M.formatEuros(r.depense).replace(/,00/, '')}</b><span>dépensés</span></div>
          <div><b>{r.marchands}</b><span>partenaire{r.marchands > 1 ? 's' : ''}</span></div>
          <div><b>{M.formatTaux(r.tauxMoyen)}</b><span>taux moyen</span></div>
        </div>
      </section>

      <ul className="recap-points">
        {r.meilleurMarchand && <li>🏅 Partenaire du mois : <b>{r.meilleurMarchand.nom}</b> ({M.formatEuros(r.meilleurMarchand.cashback)})</li>}
        {r.categorieTop && <li>🛍️ Catégorie préférée : <b>{r.categorieTop}</b></li>}
        {r.defis > 0 && <li>🏆 {r.defis} défi{r.defis > 1 ? 's' : ''} réussi{r.defis > 1 ? 's' : ''}</li>}
        {r.succes.length > 0 && <li>✨ Succès : {r.succes.join(', ')}</li>}
        {r.achats === 0 && <li>Aucun achat ce mois-ci : activez une offre pour démarrer !</li>}
      </ul>

      <button className="bouton" onClick={partager} disabled={r.gagne === 0}>Partager mon récap</button>
    </Feuille>
  );
}
