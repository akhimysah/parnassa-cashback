import { useState } from 'react';
import type { Contexte } from '../App';
import { CATEGORIES, type Categorie } from '../marchands';
import * as M from '../moteur';
import { DEPENSES_TYPE, estimer } from '../simulateur';
import { Feuille } from './Feuille';

export function Simulateur({ fermer, etat, t, ouvrirMarchand }: Contexte & { fermer: () => void }) {
  const [depenses, setDepenses] = useState<Record<Categorie, number>>(DEPENSES_TYPE);
  const [autres, setAutres] = useState(40_000);
  const { palier } = M.palierActuel(etat, t);
  const r = estimer(depenses, autres, palier.multiplicateur);
  const euros = (c: number) => M.formatEuros(c).replace(/,00/, '');

  return (
    <Feuille fermer={fermer} titre="Combien puis-je gagner ?">
      <section className="recap-carte compacte">
        <span className="etiquette">Estimation sur un an</span>
        <span className="recap-total" aria-live="polite">{euros(r.annuel)}</span>
        <span className="etiquette">soit {M.formatEuros(r.mensuel)} par mois · palier {palier.nom}</span>
      </section>
      <p className="discret">Vos dépenses mensuelles par catégorie. Chacune est comptée chez le meilleur partenaire, hors boosts et offres flash.</p>
      <div className="curseurs">
        {CATEGORIES.map((c) => {
          const ligne = r.lignes.find((l) => l.categorie === c)!;
          return (
            <label key={c} className="curseur">
              <span className="ligne-titre">
                <span>{c}</span>
                <span><b>{euros(depenses[c])}</b> <span className="discret">→ +{M.formatEuros(ligne.mensuel)}</span></span>
              </span>
              <input type="range" min={0} max={60_000} step={1000} value={depenses[c]} onChange={(e) => setDepenses({ ...depenses, [c]: Number(e.target.value) })} aria-label={`Dépenses ${c} par mois`} />
              <button type="button" className="lien petit" onClick={() => ouvrirMarchand(ligne.marchand.id)}>
                chez {ligne.marchand.nom} ({M.formatTaux(ligne.marchand.taux * palier.multiplicateur)})
              </button>
            </label>
          );
        })}
        <label className="curseur">
          <span className="ligne-titre">
            <span>Ailleurs (hors partenaires)</span>
            <span><b>{euros(autres)}</b> <span className="discret">→ +{M.formatEuros(r.horsPartenaires)}</span></span>
          </span>
          <input type="range" min={0} max={200_000} step={5000} value={autres} onChange={(e) => setAutres(Number(e.target.value))} aria-label="Autres dépenses par carte par mois" />
        </label>
      </div>
    </Feuille>
  );
}
