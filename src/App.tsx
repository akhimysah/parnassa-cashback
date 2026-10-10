import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { charger, sauver } from './etat';
import * as M from './moteur';
import { evenements, nonLues } from './notifications';
import { Accueil } from './composants/Accueil';
import { Offres } from './composants/Offres';
import { Activite } from './composants/Activite';
import { Defis } from './composants/Defis';
import { Profil } from './composants/Profil';
import { FicheMarchand } from './composants/FicheMarchand';
import { Notifications } from './composants/Notifications';
import { Utiliser } from './composants/Utiliser';
import { Bienvenue } from './composants/Bienvenue';
// Panneaux ouverts à la demande : chargés seulement au premier usage.
const Recap = lazy(() => import('./composants/Recap').then((m) => ({ default: m.Recap })));
const Simulateur = lazy(() => import('./composants/Simulateur').then((m) => ({ default: m.Simulateur })));
const Calendrier = lazy(() => import('./composants/Calendrier').then((m) => ({ default: m.Calendrier })));
const Boutique = lazy(() => import('./composants/Boutique').then((m) => ({ default: m.Boutique })));
import { debloquerSucces, trouverSucces } from './succes';

export type Onglet = 'accueil' | 'offres' | 'defis' | 'activite' | 'profil';
export type SousProfil = 'menu' | 'coffre' | 'cartes' | 'dons' | 'reclamations' | 'parrainage' | 'reglages';

const ONGLETS: { id: Onglet; libelle: string; icone: string }[] = [
  { id: 'accueil', libelle: 'Accueil', icone: '◎' },
  { id: 'offres', libelle: 'Offres', icone: '✦' },
  { id: 'defis', libelle: 'Défis', icone: '★' },
  { id: 'activite', libelle: 'Activité', icone: '≡' },
  { id: 'profil', libelle: 'Profil', icone: '☺' },
];

export interface Contexte {
  etat: M.Etat;
  t: number;
  /** Applique une modification ; renvoie false (et affiche l'erreur) si elle est refusée. */
  modifier: (f: (e: M.Etat, t: number) => M.Etat) => boolean;
  /** Change d'onglet ; pour le profil, on peut viser directement une sous-page. */
  aller: (o: Onglet, sous?: SousProfil) => void;
  sousProfil: SousProfil;
  signaler: (message: string) => void;
  ouvrirMarchand: (id: string) => void;
  ouvrirUtiliser: () => void;
  ouvrirNotifications: () => void;
  /** Récap d'un mois (« 2026-10 ») ; par défaut le plus récent avec de l'activité. */
  ouvrirRecap: (cle?: string) => void;
  ouvrirSimulateur: () => void;
  /** « Aller sur le site » : redirection suivie puis boutique de démonstration. */
  ouvrirBoutique: (id: string) => void;
  ouvrirCalendrier: () => void;
  nonLues: number;
}

type Panneau =
  | { type: 'marchand'; id: string }
  | { type: 'utiliser' }
  | { type: 'notifications' }
  | { type: 'recap'; cle?: string }
  | { type: 'simulateur' }
  | { type: 'boutique'; id: string }
  | { type: 'calendrier' }
  | null;

export function App() {
  const [etat, setEtat] = useState(charger);
  // Les raccourcis de l'application installée ouvrent directement un onglet (#offres, #defis…).
  const [onglet, setOnglet] = useState<Onglet>(() => {
    const ancre = location.hash.slice(1);
    return ONGLETS.some((o) => o.id === ancre) ? (ancre as Onglet) : 'accueil';
  });
  const [enLigne, setEnLigne] = useState(() => navigator.onLine);
  const [sousProfil, setSousProfil] = useState<SousProfil>('menu');
  const [horloge, setHorloge] = useState(Date.now);
  const [message, setMessage] = useState<string | null>(null);
  const [panneau, setPanneau] = useState<Panneau>(null);
  const t = M.maintenant(etat, horloge);

  useEffect(() => {
    const id = setInterval(() => setHorloge(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);

  // Le cashback dont le délai est écoulé devient disponible, les réclamations sont tranchées,
  // puis le versement automatique s'applique.
  useEffect(() => {
    let suivant = M.actualiser(etat, t);
    try {
      const avant = suivant;
      suivant = M.appliquerAutomatismes(suivant, t);
      if (suivant !== avant) {
        const v = suivant.versements[0];
        setMessage(`${M.formatEuros(v.montant)} versés automatiquement ${v.destination === 'coffre' ? `dans « ${suivant.coffre.nom} »` : 'sur votre compte'}`);
      }
    } catch {
      // Seuil devenu invalide : on laisse le disponible en place.
    }
    const avantSucces = suivant;
    suivant = debloquerSucces(suivant, t);
    if (suivant !== avantSucces) {
      const nouveaux = Object.keys(suivant.succes).filter((id) => !(id in avantSucces.succes));
      // Au premier chargement d'un état ancien, plusieurs succès tombent d'un coup : un seul message.
      setMessage(nouveaux.length === 1 ? `${trouverSucces(nouveaux[0])?.icone} Succès débloqué : ${trouverSucces(nouveaux[0])?.titre}` : `🏅 ${nouveaux.length} succès débloqués`);
    }
    if (suivant !== etat) setEtat(suivant);
  }, [etat, t]);

  useEffect(() => sauver(etat), [etat]);

  useEffect(() => {
    const racine = document.documentElement;
    if (etat.reglages.theme === 'auto') delete racine.dataset.theme;
    else racine.dataset.theme = etat.reglages.theme === 'sombre' ? 'dark' : 'light';
  }, [etat.reglages.theme]);

  // Notifications du navigateur pour les événements apparus depuis le dernier envoi.
  useEffect(() => {
    if (!etat.reglages.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const nouveaux = evenements(etat, t).filter((ev) => ev.date > etat.notificationsEnvoyees);
    if (!nouveaux.length) return;
    for (const ev of nouveaux.slice(0, 3)) {
      try {
        new Notification(ev.titre, { body: ev.texte, tag: ev.id, icon: `${import.meta.env.BASE_URL}icone-192.png` });
      } catch {
        // Certains navigateurs mobiles n'acceptent que les notifications du service worker.
      }
    }
    setEtat((e) => ({ ...e, notificationsEnvoyees: nouveaux[0].date }));
  }, [etat, t]);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 2800);
    return () => clearTimeout(id);
  }, [message]);

  const nbNonLues = nonLues(etat, t);
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
      aller: (o, sous = 'menu') => {
        setOnglet(o);
        setSousProfil(sous);
        window.scrollTo(0, 0);
      },
      signaler: setMessage,
      ouvrirMarchand: (id) => setPanneau({ type: 'marchand', id }),
      ouvrirUtiliser: () => setPanneau({ type: 'utiliser' }),
      ouvrirNotifications: () => setPanneau({ type: 'notifications' }),
      ouvrirRecap: (cle) => setPanneau({ type: 'recap', cle }),
      ouvrirSimulateur: () => setPanneau({ type: 'simulateur' }),
      ouvrirBoutique: (id) => setPanneau({ type: 'boutique', id }),
      ouvrirCalendrier: () => setPanneau({ type: 'calendrier' }),
      nonLues: nbNonLues,
      sousProfil,
    }),
    [etat, t, nbNonLues, sousProfil],
  );
  const fermer = () => setPanneau(null);

  return (
    <div className="appli">
      {!enLigne && <div className="hors-ligne" role="status">Hors ligne — vos données restent disponibles sur cet appareil</div>}
      <main className="contenu" key={`${onglet}:${sousProfil}`}>
        {onglet === 'accueil' && <Accueil {...ctx} />}
        {onglet === 'offres' && <Offres {...ctx} />}
        {onglet === 'defis' && <Defis {...ctx} />}
        {onglet === 'activite' && <Activite {...ctx} />}
        {onglet === 'profil' && <Profil {...ctx} />}
      </main>
      <nav className="barre" aria-label="Navigation principale">
        {ONGLETS.map((o) => (
          <button key={o.id} className={o.id === onglet ? 'actif' : ''} onClick={() => ctx.aller(o.id)} aria-current={o.id === onglet ? 'page' : undefined}>
            <span aria-hidden>{o.icone}</span>
            {o.libelle}
          </button>
        ))}
      </nav>
      {panneau?.type === 'marchand' && <FicheMarchand key={panneau.id} id={panneau.id} fermer={fermer} {...ctx} />}
      {panneau?.type === 'utiliser' && <Utiliser fermer={fermer} {...ctx} />}
      {panneau?.type === 'notifications' && <Notifications fermer={fermer} {...ctx} />}
      <Suspense fallback={null}>
        {panneau?.type === 'recap' && <Recap cle={panneau.cle} fermer={fermer} {...ctx} />}
        {panneau?.type === 'simulateur' && <Simulateur fermer={fermer} {...ctx} />}
        {panneau?.type === 'calendrier' && <Calendrier fermer={fermer} {...ctx} />}
        {panneau?.type === 'boutique' && <Boutique key={panneau.id} id={panneau.id} fermer={fermer} {...ctx} />}
      </Suspense>
      {!etat.accueilVu && <Bienvenue terminer={() => setEtat((e) => ({ ...e, accueilVu: true }))} />}
      {message && <div className="toast" role="status">{message}</div>}
    </div>
  );
}
