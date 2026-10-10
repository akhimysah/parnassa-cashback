import type { Contexte } from '../App';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';

export function restant(fin: number, t: number): string {
  const minutes = Math.max(0, Math.ceil((fin - t) / 60_000));
  const h = Math.floor(minutes / 60);
  return h ? `${h} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
}

/** Encart de l'offre flash du jour, avec compte à rebours. */
export function Flash({ etat, t, ouvrirMarchand, ouvrirBoutique }: Contexte) {
  const f = M.offreFlash(t);
  const m = trouverMarchand(f.marchandId)!;
  const { multiplicateur } = M.palierActuel(etat, t).palier;
  const actif = etat.offresActivees.includes(m.id);
  return (
    <section className="flash" style={{ ['--teinte' as string]: m.couleur }}>
      <div className="ligne-titre">
        <span className="flash-etiquette">⏱️ Offre flash</span>
        <span className="flash-chrono" aria-label={`Se termine dans ${restant(f.fin, t)}`}>Fin dans {restant(f.fin, t)}</span>
      </div>
      <button className="flash-marchand" onClick={() => ouvrirMarchand(m.id)} aria-label={`Détails de l'offre ${m.nom}`}>
        <Logo marchand={m} taille={52} />
        <span className="offre-texte">
          <b>{m.nom}</b>
          <span className="flash-taux">
            <s>{M.formatTaux(m.taux * multiplicateur)}</s> {M.formatTaux(f.taux * multiplicateur)}
          </span>
        </span>
      </button>
      <button className="bouton blanc" onClick={() => ouvrirBoutique(m.id)}>
        {actif ? 'Aller sur le site ↗' : "J'en profite ↗"}
      </button>
    </section>
  );
}
