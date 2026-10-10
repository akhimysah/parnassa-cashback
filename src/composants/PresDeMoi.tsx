import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Contexte } from '../App';
import { formatDistance, magasinsProches, PARIS, type Magasin, type Position } from '../magasins';
import * as M from '../moteur';
import { Feuille } from './Feuille';
import { Logo } from './Logo';

type Localisation = { etat: 'defaut' } | { etat: 'recherche' } | { etat: 'ok'; position: Position } | { etat: 'refus'; message: string };

function initiales(nom: string): string {
  return nom.split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
}

/** Magasins partenaires autour de l'utilisateur (la position n'est jamais enregistrée). */
export default function PresDeMoi(ctx: Contexte) {
  const { etat, t } = ctx;
  const [loc, setLoc] = useState<Localisation>({ etat: 'defaut' });
  const [choisi, setChoisi] = useState<string | null>(null);
  const [paiement, setPaiement] = useState<Magasin | null>(null);
  const centre = loc.etat === 'ok' ? loc.position : PARIS;
  const magasins = useMemo(() => magasinsProches(centre), [centre]);
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const calque = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!conteneur.current || carte.current) return;
    carte.current = L.map(conteneur.current, { zoomControl: false, attributionControl: true }).setView([PARIS.lat, PARIS.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(carte.current);
    L.control.zoom({ position: 'bottomright' }).addTo(carte.current);
    calque.current = L.layerGroup().addTo(carte.current);
    return () => {
      carte.current?.remove();
      carte.current = null;
    };
  }, []);

  // Marqueurs : position de l'utilisateur et magasins aux couleurs des marchands.
  useEffect(() => {
    const groupe = calque.current;
    if (!groupe || !carte.current) return;
    groupe.clearLayers();
    L.circleMarker([centre.lat, centre.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(groupe).bindTooltip(loc.etat === 'ok' ? 'Vous êtes ici' : 'Paris (position par défaut)');
    for (const m of magasins) {
      const icone = L.divIcon({
        className: '',
        html: `<span class="epingle${m.id === choisi ? ' choisie' : ''}" style="background:${m.marchand.couleur}"><b>${initiales(m.marchand.nom)}</b></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      L.marker([m.position.lat, m.position.lng], { icon: icone, title: m.marchand.nom, keyboard: true })
        .addTo(groupe)
        .on('click', () => setChoisi(m.id));
    }
  }, [magasins, centre, choisi, loc.etat]);

  // Recadrage seulement quand la position change (pas à chaque sélection).
  useEffect(() => {
    carte.current?.fitBounds(L.latLngBounds([[centre.lat, centre.lng], ...magasins.slice(0, 8).map((m) => [m.position.lat, m.position.lng] as [number, number])]), { padding: [30, 30], maxZoom: 15 });
  }, [magasins, centre]);

  useEffect(() => {
    if (choisi) document.getElementById(`magasin-${choisi}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [choisi]);

  const localiser = () => {
    if (!navigator.geolocation) return setLoc({ etat: 'refus', message: 'La géolocalisation n’est pas disponible sur cet appareil.' });
    setLoc({ etat: 'recherche' });
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ etat: 'ok', position: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (err) => setLoc({ etat: 'refus', message: err.code === err.PERMISSION_DENIED ? 'Position refusée : magasins affichés autour de Paris.' : 'Position introuvable : magasins affichés autour de Paris.' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  return (
    <>
      <div className="ligne-titre">
        <p className="discret">
          {loc.etat === 'ok' ? 'Magasins partenaires autour de vous.' : loc.etat === 'refus' ? loc.message : 'Magasins partenaires autour de Paris.'}
        </p>
        <button className="puce" onClick={localiser} disabled={loc.etat === 'recherche'}>
          {loc.etat === 'recherche' ? 'Recherche…' : '📍 Me localiser'}
        </button>
      </div>
      <div ref={conteneur} className="carte-leaflet" role="region" aria-label="Carte des magasins partenaires" />
      <p className="petit-texte">Démonstration : les magasins sont placés autour de la position. Votre position n'est ni enregistrée ni envoyée.</p>
      <ul className="liste">
        {magasins.map((m) => {
          // Taux du partenaire (comme dans « En ligne ») ; le paiement prévient si l'offre n'est pas activée.
          const taux = m.marchand.enMagasin! * M.palierActuel(etat, t).palier.multiplicateur;
          const actif = etat.offresActivees.includes(m.marchand.id);
          return (
            <li key={m.id} id={`magasin-${m.id}`} className={`offre ${m.id === choisi ? 'choisie' : ''}`} onClick={() => setChoisi(m.id)}>
              <Logo marchand={m.marchand} />
              <div className="offre-texte">
                <b>{m.marchand.nom}</b>
                <span className="discret">{m.adresse} · {formatDistance(m.distance)}</span>
              </div>
              <div className="offre-action">
                <span className="taux">{M.formatTaux(taux)}</span>
                <button
                  className={`puce ${actif ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaiement(m);
                  }}
                >
                  Payer ici
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {paiement && <PaiementMagasin magasin={paiement} fermer={() => setPaiement(null)} {...ctx} />}
    </>
  );
}

function PaiementMagasin({ magasin, fermer, etat, t, modifier, signaler }: Contexte & { magasin: Magasin; fermer: () => void }) {
  const m = magasin.marchand;
  const [saisie, setSaisie] = useState('');
  const montant = M.lireMontant(saisie);
  const actif = etat.offresActivees.includes(m.id);
  const apercu = montant ? M.calculerCashback(etat, m.id, montant, t, 'magasin') : 0;
  return (
    <Feuille fermer={fermer} titre="Paiement en magasin" teinte={m.couleur}>
      <header className="fiche-entete">
        <Logo marchand={m} taille={52} />
        <div className="offre-texte">
          <b>{m.nom}</b>
          <span className="discret">{magasin.adresse}</span>
        </div>
      </header>
      {!actif && (
        <div className="bandeau-boost">
          Offre non activée : seul le taux de base s'appliquerait.{' '}
          <button className="lien petit" onClick={() => modifier((e) => M.basculerOffre(e, m.id))}>Activer ({M.formatTaux(m.enMagasin! * M.palierActuel(etat, t).palier.multiplicateur)})</button>
        </div>
      )}
      <p className="discret">Présentez votre carte Parnassa en caisse : le cashback en magasin est automatique. Boosts et offres flash ne valent qu'en ligne.</p>
      <form
        className="formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (!montant) return;
          if (modifier((s, tt) => M.enregistrerAchat(s, m.id, montant, tt, `${m.nom} (magasin)`, 'magasin'))) {
            signaler(`+${M.formatEuros(apercu)} de cashback en attente`);
            fermer();
          }
        }}
      >
        <input className="champ" inputMode="decimal" placeholder="Montant du ticket en €" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Montant du ticket" autoFocus />
        <button className="bouton" disabled={!montant}>
          💳 Payer {montant ? M.formatEuros(montant) : ''} · +{M.formatEuros(apercu)}
        </button>
      </form>
    </Feuille>
  );
}
