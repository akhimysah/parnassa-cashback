import type { Contexte } from '../App';
import * as M from '../moteur';
import { gainsParCategorie, gainsParMois } from '../statistiques';

export function Statistiques({ etat, t, ouvrirRecap }: Contexte) {
  const mois = gainsParMois(etat, t, 6);
  const max = Math.max(1, ...mois.map((m) => m.cashback + m.bonus));
  const categories = gainsParCategorie(etat);
  const totalCat = categories.reduce((s, c) => s + c.cashback, 0);
  const s = M.soldes(etat);
  const depense = etat.achats.filter((a) => a.statut !== 'annule').reduce((x, a) => x + a.montant, 0);
  const cashbackAchats = etat.achats.filter((a) => a.statut !== 'annule').reduce((x, a) => x + a.cashback, 0);
  const tauxMoyen = depense ? (cashbackAchats / depense) * 100 : 0;

  return (
    <>
      <div className="sous-soldes carte">
        <div><span>Gagné au total</span><b>{M.formatEuros(s.totalGagne + s.enAttente)}</b></div>
        <div><span>Taux moyen</span><b>{M.formatTaux(tauxMoyen)}</b></div>
      </div>

      <button className="carte resume-defis" onClick={() => ouvrirRecap()} aria-label="Voir mon récap mensuel">
        <span className="defi-icone" aria-hidden>📊</span>
        <span className="offre-texte">
          <b>Mon récap mensuel</b>
          <span className="discret">Le mois en chiffres, à partager</span>
        </span>
        <span aria-hidden>›</span>
      </button>

      <section className="carte">
        <div className="ligne-titre">
          <h2>6 derniers mois</h2>
          <span className="legende"><i className="cb" /> Cashback <i className="bn" /> Bonus</span>
        </div>
        <div className="histogramme" role="img" aria-label="Gains par mois">
          {mois.map((m) => (
            <div key={m.cle} className="colonne" title={`${m.libelle} : ${M.formatEuros(m.cashback + m.bonus)}`}>
              <span className="valeur">{m.cashback + m.bonus > 0 ? M.formatEuros(m.cashback + m.bonus).replace(/,00/, '') : ''}</span>
              <div className="pile">
                <div className="bn" style={{ height: `${(m.bonus / max) * 100}%` }} />
                <div className="cb" style={{ height: `${(m.cashback / max) * 100}%` }} />
              </div>
              <span className="mois">{m.libelle}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="carte">
        <h2>Par catégorie</h2>
        {categories.length === 0 && <p className="discret">Aucun cashback pour l'instant.</p>}
        {categories.map((c) => (
          <div key={c.categorie} className="barre-cat">
            <div className="ligne-titre">
              <span>{c.categorie}</span>
              <b>{M.formatEuros(c.cashback)}</b>
            </div>
            <div className="jauge fine"><div style={{ width: `${(c.cashback / totalCat) * 100}%` }} /></div>
          </div>
        ))}
      </section>
    </>
  );
}
