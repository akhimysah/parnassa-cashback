import { useEffect, useState } from 'react';
import type { Contexte } from '../App';
import { evenements } from '../notifications';
import { Feuille } from './Feuille';

const quand = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

function depuis(date: number, t: number): string {
  const minutes = Math.round((date - t) / 60_000);
  if (minutes > -60) return minutes > -1 ? "à l'instant" : quand.format(minutes, 'minute');
  const heures = Math.round(minutes / 60);
  if (heures > -24) return quand.format(heures, 'hour');
  return quand.format(Math.round(heures / 24), 'day');
}

export function Notifications({ fermer, etat, t, modifier, aller }: Contexte & { fermer: () => void }) {
  const liste = evenements(etat, t);
  // Ce qui était non lu à l'ouverture reste en évidence tant que le panneau est ouvert.
  const [vuJusqua] = useState(etat.notificationsLues);

  useEffect(() => {
    if (liste.length && liste[0].date > etat.notificationsLues) modifier((e) => ({ ...e, notificationsLues: liste[0].date }));
  }, [liste, etat.notificationsLues, modifier]);

  return (
    <Feuille fermer={fermer} titre="Notifications">
      {liste.length === 0 && <p className="vide">Rien de neuf pour l'instant.</p>}
      <ul className="liste notifs">
        {liste.map((ev) => (
          <li key={ev.id}>
            <button
              className={`notif ${ev.date > vuJusqua ? 'nouvelle' : ''}`}
              onClick={() => {
                aller(ev.cible, ev.sous);
                fermer();
              }}
            >
              <span className="notif-icone" aria-hidden>{ev.icone}</span>
              <span className="offre-texte">
                <b>{ev.titre}</b>
                <span className="discret">{ev.texte}</span>
              </span>
              <span className="notif-date">{depuis(ev.date, t)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Feuille>
  );
}
