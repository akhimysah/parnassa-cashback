import { useEffect, useMemo, useState } from 'react';
import { charger, sauver } from './etat';
import * as M from './moteur';
import { Accueil } from './composants/Accueil';
import { Offres } from './composants/Offres';
import { Activite } from './composants/Activite';
import { Parrainer } from './composants/Parrainer';
import { Defis } from './composants/Defis';
import { FicheMarchand } from './composants/FicheMarchand';

export type Onglet = 'accueil' | 'offres' | 'defis' | 'activite' | 'parrainer';

const ONGLETS: { id: Onglet; libelle: string; icone: string }[] = [
  { id: 'accueil', libelle: 'Accueil', icone: '◎' },
  { id: 'offres', libelle: 'Offres', icone: '✦' },
  { id: 'defis', libelle: 'Défis', icone: '★' },
  { id: 'activite', libelle: 'Activité', icone: '≡' },
  { id: 'parrainer', libelle: 'Parrainer', icone: '♥' },
];

export interface Contexte {
  etat: M.Etat;
  t: number;
  /** Applique une modification ; renvoie false (et affiche l'erreur) si elle est refusée. */
  modifier: (f: (e: M.Etat, t: number) => M.Etat) => boolean;
  aller: (o: Onglet) => void;
  signaler: (message: string) => void;
  ouvrirMarchand: (id: string) => void;
}

export function App() {
  const [etat, setEtat] = useState(charger);
  const [onglet, setOnglet] = useState<Onglet>('accueil');
  const [horloge, setHorloge] = useState(Date.now);
  const [message, setMessage] = useState<string | null>(null);
  const [fiche, setFiche] = useState<string | null>(null);
  const t = M.maintenant(etat, horloge);

  useEffect(() => {
    const id = setInterval(() => setHorloge(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Le cashback dont le délai est écoulé devient disponible.
  useEffect(() => {
    const suivant = M.actualiser(etat, t);
    if (suivant !== etat) setEtat(suivant);
  }, [etat, t]);

  useEffect(() => sauver(etat), [etat]);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 2800);
    return () => clearTimeout(id);
  }, [message]);

  const ctx: Contexte = useMemo(
    () => ({
      etat,
      t,
      modifier: (f) => {
        try {
          // L'horloge affichée avance avec l'action, sinon un achat tout juste fait paraîtrait dans le futur.
          const instant = Date.now();
          setEtat(f(etat, M.maintenant(etat, instant)));
          setHorloge(instant);
          return true;
        } catch (err) {
          setMessage((err as Error).message);
          return false;
        }
      },
      aller: setOnglet,
      signaler: setMessage,
      ouvrirMarchand: setFiche,
    }),
    [etat, t],
  );

  return (
    <div className="appli">
      <main className="contenu" key={onglet}>
        {onglet === 'accueil' && <Accueil {...ctx} />}
        {onglet === 'offres' && <Offres {...ctx} />}
        {onglet === 'defis' && <Defis {...ctx} />}
        {onglet === 'activite' && <Activite {...ctx} />}
        {onglet === 'parrainer' && <Parrainer {...ctx} />}
      </main>
      <nav className="barre" aria-label="Navigation principale">
        {ONGLETS.map((o) => (
          <button key={o.id} className={o.id === onglet ? 'actif' : ''} onClick={() => setOnglet(o.id)} aria-current={o.id === onglet ? 'page' : undefined}>
            <span aria-hidden>{o.icone}</span>
            {o.libelle}
          </button>
        ))}
      </nav>
      {fiche && <FicheMarchand key={fiche} id={fiche} fermer={() => setFiche(null)} {...ctx} />}
      {message && <div className="toast" role="status">{message}</div>}
    </div>
  );
}
