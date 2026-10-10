import { useEffect, useState } from 'react';
import type { Contexte } from '../App';
import { appliquerCode, codesDe } from '../codes';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { ajouter, PRODUITS, totalPanier, type Panier } from '../produits';
import { Logo } from './Logo';

type Etape = 'redirection' | 'boutique' | 'confirmation';
const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/** Parcours complet de démonstration : redirection suivie, boutique du marchand, paiement par carte Parnassa. */
export function Boutique({ id, fermer, etat, t, modifier }: Contexte & { id: string; fermer: () => void }) {
  const m = trouverMarchand(id)!;
  const produits = PRODUITS[m.categorie];
  const [etape, setEtape] = useState<Etape>('redirection');
  const [panier, setPanier] = useState<Panier>({});
  const [saisieCode, setSaisieCode] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [commande, setCommande] = useState<{ montant: number; cashback: number; disponibleLe: number } | null>(null);

  const sousTotal = totalPanier(produits, panier);
  let remise = 0;
  let codeInvalide: string | null = null;
  if (code) {
    try {
      remise = appliquerCode(m.id, code, sousTotal).remise;
    } catch (e) {
      codeInvalide = (e as Error).message;
    }
  }
  const total = sousTotal - remise;
  const actif = etat.offresActivees.includes(m.id);
  const cashback = total > 0 ? M.calculerCashback(etat, m.id, total, t) : 0;
  const articles = Object.values(panier).reduce((s, n) => s + n, 0);

  // La redirection active l'offre (comme un lien d'affiliation) puis ouvre la boutique.
  useEffect(() => {
    if (!actif) modifier((e) => M.basculerOffre(e, m.id));
    const id = setTimeout(() => setEtape('boutique'), 1400);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [fermer]);

  const payer = () => {
    if (total <= 0) return;
    const ok = modifier((e, tt) => M.enregistrerAchat(e, m.id, total, tt));
    if (ok) {
      setCommande({ montant: total, cashback, disponibleLe: t + m.delaiJours * M.JOUR });
      setEtape('confirmation');
    }
  };

  return (
    <div className="boutique" role="dialog" aria-modal="true" aria-label={`Boutique ${m.nom}`} style={{ ['--teinte' as string]: m.couleur }}>
      {etape === 'redirection' && (
        <div className="redirection">
          <Logo marchand={m} taille={72} />
          <p className="redirection-titre">Redirection vers {m.nom}…</p>
          <div className="redirection-badge">✓ Cashback activé · {M.formatTaux(M.tauxEffectif({ ...etat, offresActivees: [...etat.offresActivees, m.id] }, m.id, t))}</div>
          <span className="sablier" aria-hidden />
          <p className="petit-texte">Payez avec votre carte Parnassa pour que l'achat soit suivi.</p>
        </div>
      )}

      {etape !== 'redirection' && (
        <header className="boutique-entete">
          <button className="lien" onClick={fermer}>‹ Parnassa</button>
          <span className="boutique-nom"><Logo marchand={m} taille={28} /> {m.nom}</span>
          <span className="boutique-suivi" title="Achat suivi par Parnassa Cashback">● suivi</span>
        </header>
      )}

      {etape === 'boutique' && (
        <div className="boutique-corps">
          <p className="discret">{m.accroche} — boutique de démonstration</p>
          <ul className="produits">
            {produits.map((p) => (
              <li key={p.id} className="produit">
                <span className="produit-visuel" aria-hidden>{p.emoji}</span>
                <b>{p.nom}</b>
                <span>{M.formatEuros(p.prix)}</span>
                <div className="quantite">
                  <button onClick={() => setPanier(ajouter(panier, p.id, -1))} disabled={!panier[p.id]} aria-label={`Retirer ${p.nom}`}>−</button>
                  <span aria-live="polite">{panier[p.id] ?? 0}</span>
                  <button onClick={() => setPanier(ajouter(panier, p.id, 1))} aria-label={`Ajouter ${p.nom}`}>+</button>
                </div>
              </li>
            ))}
          </ul>

          {articles > 0 && (
            <button className="barre-panier" onClick={() => document.getElementById('panier')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>🛒 {articles} · {M.formatEuros(total)}</span>
              <span className="petit-texte">+{M.formatEuros(cashback)} de cashback ↓</span>
            </button>
          )}

          <section className="panier" id="panier">
            <form
              className="rangee"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  appliquerCode(m.id, saisieCode, Math.max(sousTotal, 1e9));
                  setCode(saisieCode);
                  setErreurCode(null);
                } catch (err) {
                  setErreurCode((err as Error).message);
                }
              }}
            >
              <input className="champ" placeholder="Code promo" value={saisieCode} onChange={(e) => setSaisieCode(e.target.value)} aria-label="Code promo" />
              <button className="bouton secondaire" style={{ width: 'auto' }} disabled={!saisieCode.trim()}>OK</button>
            </form>
            {codesDe(m.id).length > 0 && !code && (
              <p className="petit-texte">
                Astuce Parnassa : {codesDe(m.id).map((c) => <button key={c.code} type="button" className="lien petit" onClick={() => { setSaisieCode(c.code); setCode(c.code); setErreurCode(null); }}>{c.code}</button>)} ({codesDe(m.id)[0].description})
              </p>
            )}
            {(erreurCode || codeInvalide) && <p className="alerte">{erreurCode ?? codeInvalide}</p>}
            <div className="ligne-titre"><span>Sous-total ({articles} article{articles > 1 ? 's' : ''})</span><span>{M.formatEuros(sousTotal)}</span></div>
            {remise > 0 && <div className="ligne-titre"><span>Code {code?.toUpperCase()}</span><span>−{M.formatEuros(remise)}</span></div>}
            <div className="ligne-titre total"><span>Total</span><b>{M.formatEuros(total)}</b></div>
            <div className="ligne-titre cashback-prevu"><span>Cashback Parnassa</span><b>+{M.formatEuros(cashback)}</b></div>
            <button className="bouton payer" disabled={total <= 0} onClick={payer}>
              💳 Payer {total > 0 ? M.formatEuros(total) : ''} avec ma carte Parnassa
            </button>
          </section>
        </div>
      )}

      {etape === 'confirmation' && commande && (
        <div className="redirection">
          <span className="coche" aria-hidden>✓</span>
          <p className="redirection-titre">Commande validée</p>
          <p>{M.formatEuros(commande.montant)} payés chez {m.nom}</p>
          <div className="redirection-badge">+{M.formatEuros(commande.cashback)} de cashback en attente</div>
          <p className="petit-texte">Disponible le {jour.format(commande.disponibleLe)}, après le délai de rétractation.</p>
          <button className="bouton blanc" onClick={fermer}>Retour à Parnassa</button>
        </div>
      )}
    </div>
  );
}
