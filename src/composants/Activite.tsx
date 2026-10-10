import { useState } from 'react';
import type { Contexte } from '../App';
import { MARCHANDS, trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { Logo } from './Logo';
import { Statistiques } from './Statistiques';

const STATUTS: Record<M.Statut, string> = { en_attente: 'En attente', disponible: 'Disponible', annule: 'Annulé' };
const DESTINATIONS = {
  compte: { libelle: 'Versement sur le compte Parnassa', icone: '↧', couleur: '#0f766e' },
  coffre: { libelle: 'Mis de côté', icone: '🐷', couleur: '#db2777' },
  carte: { libelle: 'Carte cadeau', icone: '🎁', couleur: '#7c3aed' },
} as const;
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

type Ligne =
  | { type: 'achat'; date: number; a: M.Achat }
  | { type: 'parrainage'; date: number; p: M.Parrainage }
  | { type: 'bonus'; date: number; b: M.Bonus }
  | { type: 'versement'; date: number; v: M.Versement };

export function Activite(ctx: Contexte) {
  const [vue, setVue] = useState<'historique' | 'statistiques'>('historique');
  return (
    <>
      <h1>Activité</h1>
      <div className="segments" role="tablist">
        {(['historique', 'statistiques'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={vue === v} className={vue === v ? 'actif' : ''} onClick={() => setVue(v)}>
            {v === 'historique' ? 'Historique' : 'Statistiques'}
          </button>
        ))}
      </div>
      {vue === 'historique' ? <Historique {...ctx} /> : <Statistiques {...ctx} />}
    </>
  );
}

function Historique({ etat, t, modifier, signaler }: Contexte) {
  const [marchandId, setMarchandId] = useState<string>('');
  const [saisie, setSaisie] = useState('');
  const montant = M.lireMontant(saisie);
  const id = marchandId || null;
  const apercu = montant ? M.calculerCashback(etat, id, montant, t) : 0;
  const nonActive = id !== null && !etat.offresActivees.includes(id);

  const lignes: Ligne[] = [
    ...etat.achats.map((a) => ({ type: 'achat' as const, date: a.date, a })),
    ...etat.parrainages.map((p) => ({ type: 'parrainage' as const, date: p.date, p })),
    ...etat.bonus.map((b) => ({ type: 'bonus' as const, date: b.date, b })),
    ...etat.versements.map((v) => ({ type: 'versement' as const, date: v.date, v })),
  ].sort((x, y) => y.date - x.date);

  return (
    <>
      <form
        className="carte formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (!montant) return;
          if (modifier((s, tt) => M.enregistrerAchat(s, id, montant, tt))) signaler(`+${M.formatEuros(apercu)} de cashback en attente`);
          setSaisie('');
        }}
      >
        <b>Simuler un paiement par carte</b>
        <select className="champ" value={marchandId} onChange={(e) => setMarchandId(e.target.value)}>
          <option value="">Autre commerçant ({M.formatTaux(M.tauxEffectif(etat, null, t))})</option>
          {MARCHANDS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom} {etat.offresActivees.includes(m.id) ? `(${M.formatTaux(M.tauxEffectif(etat, m.id, t))})` : '(offre non activée)'}
            </option>
          ))}
        </select>
        <input className="champ" inputMode="decimal" placeholder="Montant en €" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-invalid={saisie !== '' && !montant} />
        {nonActive && <p className="alerte">Offre non activée : seul le taux de base s'applique.</p>}
        <button className="bouton" disabled={!montant}>
          Payer {montant ? M.formatEuros(montant) : ''} · cashback {M.formatEuros(apercu)}
        </button>
      </form>

      <ul className="liste">
        {lignes.length === 0 && <li className="vide">Aucune opération pour l'instant.</li>}
        {lignes.map((l) => {
          if (l.type === 'achat') {
            const { a } = l;
            const restant = Math.ceil((a.disponibleLe - t) / M.JOUR);
            return (
              <li key={a.id} className={`operation ${a.statut}`}>
                <Logo marchand={trouverMarchand(a.marchandId)} taille={38} />
                <div className="offre-texte">
                  <b>{a.libelle}</b>
                  <span className="discret">
                    {date.format(a.date)} · {M.formatEuros(a.montant)}
                    {a.statut === 'en_attente' && ` · dispo dans ${restant} j`}
                  </span>
                </div>
                <div className="offre-action">
                  <span className="montant">+{M.formatEuros(a.cashback)}</span>
                  <span className={`statut ${a.statut}`}>{STATUTS[a.statut]}</span>
                  {a.statut === 'en_attente' && (
                    <button className="lien petit" onClick={() => modifier((s) => M.annulerAchat(s, a.id))}>Retour produit</button>
                  )}
                </div>
              </li>
            );
          }
          if (l.type === 'parrainage') {
            const { p } = l;
            return (
              <li key={p.id} className="operation">
                <span className="logo" style={{ width: 38, height: 38, background: '#7c3aed' }}>♥</span>
                <div className="offre-texte">
                  <b>Parrainage de {p.prenom}</b>
                  <span className="discret">{date.format(p.date)}</span>
                </div>
                <div className="offre-action">
                  <span className="montant">+{M.formatEuros(M.BONUS_PARRAINAGE)}</span>
                  <span className={`statut ${p.statut}`}>{STATUTS[p.statut]}</span>
                </div>
              </li>
            );
          }
          if (l.type === 'bonus') {
            const { b } = l;
            return (
              <li key={b.id} className="operation">
                <span className="logo" style={{ width: 38, height: 38, background: '#d97706' }}>★</span>
                <div className="offre-texte">
                  <b>{b.libelle}</b>
                  <span className="discret">{date.format(b.date)}</span>
                </div>
                <div className="offre-action">
                  <span className="montant">+{M.formatEuros(b.montant)}</span>
                  <span className="statut disponible">Disponible</span>
                </div>
              </li>
            );
          }
          const { v } = l;
          return (
            <li key={v.id} className="operation">
              <span className="logo" style={{ width: 38, height: 38, background: DESTINATIONS[v.destination].couleur }}>{DESTINATIONS[v.destination].icone}</span>
              <div className="offre-texte">
                <b>{v.destination === 'coffre' ? `Mis de côté dans « ${etat.coffre.nom} »` : DESTINATIONS[v.destination].libelle}</b>
                <span className="discret">{date.format(v.date)}</span>
              </div>
              <div className="offre-action">
                <span className="montant negatif">−{M.formatEuros(v.montant)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
