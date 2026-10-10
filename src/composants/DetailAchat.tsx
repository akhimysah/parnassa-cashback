import type { Contexte } from '../App';
import { trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { offreFlash, boostsDeLaSemaine } from '../moteur';
import { Feuille } from './Feuille';
import { Logo } from './Logo';

const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Détail d'un achat : montant, taux obtenu, chronologie jusqu'à la disponibilité. */
export function DetailAchat({ id, fermer, etat, t, modifier, signaler, aller, ouvrirMarchand }: Contexte & { id: string; fermer: () => void }) {
  const a = etat.achats.find((x) => x.id === id);
  if (!a) return null;
  const m = trouverMarchand(a.marchandId);
  const taux = (a.cashback / a.montant) * 100;
  const promo = m && (offreFlash(a.date).marchandId === m.id ? 'Offre flash' : boostsDeLaSemaine(a.date).includes(m.id) ? 'Boost de la semaine' : null);
  const etapes: { titre: string; quand: string; fait: boolean; annule?: boolean }[] = [
    { titre: 'Paiement par carte Parnassa', quand: date.format(a.date), fait: true },
    { titre: 'Achat suivi, cashback en attente', quand: date.format(a.date), fait: true },
    a.statut === 'annule'
      ? { titre: 'Annulé (retour produit)', quand: '', fait: true, annule: true }
      : {
          titre: a.statut === 'disponible' ? 'Cashback disponible' : 'Disponible après le délai de rétractation',
          quand: `${a.statut === 'disponible' ? '' : 'prévu le '}${date.format(a.disponibleLe)}`,
          fait: a.statut === 'disponible',
        },
  ];

  return (
    <Feuille fermer={fermer} teinte={m?.couleur}>
      <header className="fiche-entete">
        <Logo marchand={m} taille={56} />
        <div className="offre-texte">
          <h2>{a.libelle}</h2>
          <span className="discret">{m ? m.categorie : 'Paiement hors partenaires'}</span>
        </div>
      </header>
      <div className="sous-soldes carte">
        <div><span>Montant payé</span><b>{M.formatEuros(a.montant)}</b></div>
        <div><span>Cashback ({M.formatTaux(taux)})</span><b className={a.statut === 'annule' ? 'barre-texte' : 'montant'}>+{M.formatEuros(a.cashback)}</b></div>
      </div>
      {promo && <p className="bandeau-boost">{promo === 'Offre flash' ? '⏱️' : '⚡'} Acheté pendant : {promo}</p>}

      <ol className="chronologie">
        {etapes.map((e, i) => (
          <li key={i} className={`${e.fait ? 'fait' : ''} ${e.annule ? 'annule' : ''}`}>
            <b>{e.titre}</b>
            {e.quand && <span className="petit-texte">{e.quand}</span>}
          </li>
        ))}
      </ol>

      {a.statut === 'en_attente' && (
        <button
          className="bouton secondaire"
          onClick={() => {
            if (confirm('Déclarer un retour produit ? Le cashback de cet achat sera annulé.') && modifier((e) => M.annulerAchat(e, a.id))) {
              signaler('Cashback annulé suite au retour');
            }
          }}
        >
          Déclarer un retour produit
        </button>
      )}
      <div className="rangee">
        {m && <button className="bouton secondaire" onClick={() => ouvrirMarchand(m.id)}>Voir {m.nom}</button>}
        <button
          className="bouton secondaire"
          onClick={() => {
            aller('profil', 'reclamations');
            fermer();
          }}
        >
          Signaler un problème
        </button>
      </div>
      <p className="petit-texte">Référence : {a.id}</p>
    </Feuille>
  );
}
