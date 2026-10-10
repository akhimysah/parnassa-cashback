import { useState } from 'react';
import type { Contexte } from '../App';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { valeurCarte } from '../cartes';
import { bilanMarchand } from '../statistiques';
import { codesDe } from '../codes';
import { historiqueTaux, prochainePromo } from '../calendrier';
import { ajouterAlerte, supprimerAlerte } from '../alertes';
import { Feuille } from './Feuille';
import { Logo } from './Logo';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function FicheMarchand({ id, fermer, etat, t, modifier, signaler, ouvrirBoutique }: Contexte & { id: string; fermer: () => void }) {
  const m = trouverMarchand(id)!;
  const [saisie, setSaisie] = useState('');
  const actif = etat.offresActivees.includes(m.id);
  const favori = etat.favoris.includes(m.id);
  const booste = M.boostsDeLaSemaine(t).includes(m.id);
  const { palier } = M.palierActuel(etat, t);
  const bilan = bilanMarchand(etat, m.id);
  const montant = M.lireMontant(saisie);
  const apercu = montant ? M.calculerCashback(etat, m.id, montant, t) : 0;

  return (
    <Feuille fermer={fermer} teinte={m.couleur}>
      <header className="fiche-entete">
        <Logo marchand={m} taille={64} />
        <div className="offre-texte">
          <h2>{m.nom}</h2>
          <span className="discret">{m.categorie} · {m.accroche}</span>
        </div>
        <button
          className="coeur"
          aria-label={`Partager l'offre ${m.nom}`}
          onClick={async () => {
            const texte = `${m.nom} : ${M.formatTaux(M.tauxMarchand(m.id, t))} de cashback avec Parnassa. Mon code de parrainage : ${etat.codeParrainage}`;
            try {
              if (navigator.share) await navigator.share({ text: texte });
              else {
                await navigator.clipboard.writeText(texte);
                signaler('Offre copiée');
              }
            } catch {
              // Partage annulé.
            }
          }}
        >
          ↗
        </button>
        <button
          className={`coeur ${favori ? 'plein' : ''}`}
          aria-pressed={favori}
          aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={() => modifier((e) => M.basculerFavori(e, m.id))}
        >
          {favori ? '♥' : '♡'}
        </button>
      </header>

      <div className="fiche-taux">
        <span className="taux grand">{M.formatTaux(M.tauxMarchand(m.id, t) * palier.multiplicateur)}</span>
        <span className="discret">
          de cashback
          {palier.multiplicateur > 1 && ` (palier ${palier.nom} ×${palier.multiplicateur.toLocaleString('fr-FR')})`}
        </span>
        {M.offreFlash(t).marchandId === m.id && <p className="bandeau-boost">⏱️ Offre flash : ×{M.COEF_FLASH} jusqu'à minuit</p>}
        {booste && <p className="bandeau-boost">⚡ Boost ×{M.COEF_BOOST.toLocaleString('fr-FR')} jusqu'au {jour.format(M.finDeSemaine(t) - 1)}</p>}
      </div>

      <HistoriqueTaux id={m.id} t={t} multiplicateur={palier.multiplicateur} />

      <Alerte marchandId={m.id} etat={etat} t={t} modifier={modifier} signaler={signaler} />

      <table className="paliers">
        <tbody>
          {M.PALIERS.map((p) => (
            <tr key={p.nom} className={p.nom === palier.nom ? 'courant' : ''}>
              <td>{p.nom}</td>
              <td>{M.formatTaux(M.tauxMarchand(m.id, t) * p.multiplicateur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="conditions-liste">
        <li>Cashback disponible {m.delaiJours} jours après l'achat (délai de rétractation).</li>
        {m.plafond !== undefined && <li>Plafonné à {M.formatEuros(m.plafond)} de cashback par achat.</li>}
        {m.bonusCarte && <li>Carte cadeau : +{m.bonusCarte} % (ex. {M.formatEuros(2000)} de cashback → {M.formatEuros(valeurCarte(m.id, 2000))} chez {m.nom}).</li>}
        <li>Payez avec votre carte Parnassa après avoir activé l'offre.</li>
      </ul>

      {bilan.achats > 0 && (
        <p className="discret">
          Déjà {bilan.achats} achat{bilan.achats > 1 ? 's' : ''} ici : {M.formatEuros(bilan.cashback)} gagnés sur {M.formatEuros(bilan.depense)}.
        </p>
      )}

      {codesDe(m.id).length > 0 && (
        <div className="codes">
          {codesDe(m.id).map((c) => (
            <button
              key={c.code}
              className="code-promo"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(c.code);
                  signaler(`Code ${c.code} copié`);
                } catch {
                  signaler(`Code : ${c.code}`);
                }
              }}
              aria-label={`Copier le code ${c.code} : ${c.description}`}
            >
              <span className="code-promo-code">{c.code}</span>
              <span className="petit-texte">{c.description} · cumulable</span>
            </button>
          ))}
        </div>
      )}

      <button className="bouton" onClick={() => ouvrirBoutique(m.id)}>
        {actif ? 'Aller sur le site' : 'Activer et aller sur le site'} ↗
      </button>
      {actif && (
        <button className="lien petit centre" onClick={() => modifier((e) => M.basculerOffre(e, m.id))}>
          Désactiver l'offre
        </button>
      )}

      {actif && (
        <details className="saisie-rapide">
          <summary>Déclarer un paiement en magasin</summary>
          <form
            className="rangee"
            onSubmit={(e) => {
              e.preventDefault();
              if (!montant) return;
              if (modifier((s, tt) => M.enregistrerAchat(s, m.id, montant, tt))) signaler(`+${M.formatEuros(apercu)} de cashback en attente`);
              setSaisie('');
            }}
          >
            <input className="champ" inputMode="decimal" placeholder="Montant en €" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Montant de l'achat" />
            <button className="bouton secondaire" disabled={!montant} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
              Payer{montant ? ` · +${M.formatEuros(apercu)}` : ''}
            </button>
          </form>
        </details>
      )}
    </Feuille>
  );
}

const semaineCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Taux semaine par semaine (6 passées, 2 à venir) et prochaine promo. */
function HistoriqueTaux({ id, t, multiplicateur }: { id: string; t: number; multiplicateur: number }) {
  const points = historiqueTaux(id, t, 6, 2);
  const max = Math.max(...points.map((p) => p.max));
  const promo = prochainePromo(id, t);
  return (
    <section className="historique-taux">
      <div className="ligne-titre">
        <b>Taux des dernières semaines</b>
        <span className="petit-texte">{!promo
            ? 'Pas de promo prévue sous 4 semaines'
            : M.debutJour(promo.quand) === M.debutJour(t)
              ? `Promo en cours : ${promo.type === 'flash' ? 'offre flash' : 'boost'}`
              : `Prochaine promo : ${promo.type === 'flash' ? 'offre flash' : 'boost'} le ${jourLong.format(promo.quand)}`}</span>
      </div>
      <div className="barres-taux" role="img" aria-label="Taux par semaine">
        {points.map((p, i) => (
          <div key={p.debut} className={`barre-taux ${i === 6 ? 'courante' : ''} ${i > 6 ? 'future' : ''}`} title={`Semaine du ${semaineCourte.format(p.debut)} : jusqu'à ${M.formatTaux(p.max * multiplicateur)}`}>
            <span className={`colonne-taux ${p.flash ? 'flash' : p.booste ? 'boost' : ''}`} style={{ height: `${(p.max / max) * 100}%` }} />
            <span className="petit-texte">{i === 6 ? 'auj.' : semaineCourte.format(p.debut).replace(/\.$/, '')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** « Prévenez-moi quand ce marchand dépasse X % ». */
function Alerte({ marchandId, etat, t, modifier, signaler }: Pick<Contexte, 'etat' | 't' | 'modifier' | 'signaler'> & { marchandId: string }) {
  const m = trouverMarchand(marchandId)!;
  const mult = M.palierActuel(etat, t).palier.multiplicateur;
  const existante = etat.alertes.find((a) => a.marchandId === marchandId);
  const suggestion = Math.round(m.taux * M.COEF_BOOST * mult * 10) / 10;
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState(String(existante?.seuil ?? suggestion).replace('.', ','));
  const seuil = Number(saisie.replace(',', '.').replace('%', '').trim());

  if (!ouvert) {
    return (
      <button className="alerte-taux" onClick={() => setOuvert(true)}>
        🔔 {existante ? `Alerte à ${M.formatTaux(existante.seuil)} — modifier` : `M'alerter quand le taux dépasse…`}
      </button>
    );
  }
  return (
    <form
      className="alerte-taux ouverte"
      onSubmit={(e) => {
        e.preventDefault();
        if (modifier((s, tt) => ajouterAlerte(s, marchandId, seuil, tt))) {
          signaler(`Alerte créée : ${m.nom} à ${M.formatTaux(seuil)}`);
          setOuvert(false);
        }
      }}
    >
      <label className="petit-texte" htmlFor={`seuil-${marchandId}`}>Prévenez-moi quand {m.nom} atteint (taux habituel {M.formatTaux(m.taux * mult)}) :</label>
      <div className="rangee">
        <input id={`seuil-${marchandId}`} className="champ" inputMode="decimal" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-invalid={!Number.isFinite(seuil)} />
        <button className="bouton" style={{ width: 'auto' }} disabled={!Number.isFinite(seuil) || seuil <= 0}>OK</button>
        {existante && (
          <button type="button" className="bouton secondaire" style={{ width: 'auto' }} onClick={() => { modifier((s) => supprimerAlerte(s, existante.id)); setOuvert(false); }}>
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
