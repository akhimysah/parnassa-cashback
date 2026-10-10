import { useState, type ReactNode } from 'react';
import type { Contexte, SousProfil } from '../App';
import { MARCHANDS, trouverMarchand } from '../marchands';
import * as M from '../moteur';
import { marquerCarte } from '../cartes';
import { historiqueCsv, telecharger } from '../exporter';
import { exporterSauvegarde, lireSauvegarde } from '../sauvegarde';
import { ASSOCIATIONS, TAUX_REDUCTION, trouverAssociation } from '../associations';
import { Logo } from './Logo';
import { Parrainer } from './Parrainer';

type Vue = SousProfil;
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function Profil(ctx: Contexte) {
  const [vue, setVue] = useState<Vue>(ctx.sousProfil);
  const { etat, t } = ctx;
  const retour = () => setVue('menu');

  if (vue === 'coffre') return <SousPage titre={etat.coffre.nom} retour={retour}><Coffre {...ctx} /></SousPage>;
  if (vue === 'cartes') return <SousPage titre="Cartes cadeaux" retour={retour}><Cartes {...ctx} /></SousPage>;
  if (vue === 'dons') return <SousPage titre="Dons solidaires" retour={retour}><Dons {...ctx} /></SousPage>;
  if (vue === 'reclamations') return <SousPage titre="Cashback manquant" retour={retour}><Reclamations {...ctx} /></SousPage>;
  if (vue === 'parrainage') return <SousPage titre="Parrainer" retour={retour}><Parrainer {...ctx} /></SousPage>;
  if (vue === 'reglages') return <SousPage titre="Réglages" retour={retour}><Reglages {...ctx} /></SousPage>;

  const { palier } = M.palierActuel(etat, t);
  const s = M.soldes(etat);
  const cartesActives = etat.cartes.filter((c) => !c.utilisee).length;
  const enEtude = etat.reclamations.filter((r) => r.statut === 'en_etude').length;
  const totalDons = etat.versements.filter((v) => v.destination === 'don').reduce((x, v) => x + v.montant, 0);
  const entrees: [Vue, string, string, string][] = [
    ['coffre', '🐷', etat.coffre.nom, `${M.formatEuros(M.soldeCoffre(etat))} sur ${M.formatEuros(etat.coffre.objectif)}`],
    ['cartes', '🎁', 'Cartes cadeaux', cartesActives ? `${cartesActives} à utiliser` : 'Convertissez votre cashback avec bonus'],
    ['dons', '💝', 'Dons solidaires', totalDons ? `${M.formatEuros(totalDons)} donnés · merci !` : 'Donnez tout ou partie de votre cashback'],
    ['reclamations', '📨', 'Cashback manquant', enEtude ? `${enEtude} réclamation${enEtude > 1 ? 's' : ''} en cours` : 'Signaler un achat non crédité'],
    ['parrainage', '💜', 'Parrainer', `${M.formatEuros(M.BONUS_PARRAINAGE)} par ami · code ${etat.codeParrainage}`],
    ['reglages', '⚙️', 'Réglages', 'Thème, versement automatique, notifications'],
  ];

  return (
    <>
      <h1>Profil</h1>
      <section className="carte profil-entete">
        <span className={`badge-palier grand ${palier.nom.toLowerCase()}`}>{palier.nom}</span>
        <div className="offre-texte">
          <b>Membre Parnassa Cashback</b>
          <span className="discret">{M.formatEuros(s.totalGagne + s.enAttente)} gagnés · {etat.offresActivees.length} offres activées · {etat.favoris.length} favoris</span>
        </div>
      </section>
      <ul className="liste">
        {entrees.map(([id, icone, titre, sous]) => (
          <li key={id}>
            <button className="entree" onClick={() => setVue(id)}>
              <span className="notif-icone" aria-hidden>{icone}</span>
              <span className="offre-texte">
                <b>{titre}</b>
                <span className="discret">{sous}</span>
              </span>
              <span aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>
      <Demo {...ctx} />
    </>
  );
}

function SousPage({ titre, retour, children }: { titre: string; retour: () => void; children: ReactNode }) {
  return (
    <>
      <button className="lien retour" onClick={retour}>‹ Profil</button>
      <h1>{titre}</h1>
      {children}
    </>
  );
}

function Coffre({ etat, modifier, signaler }: Contexte) {
  const solde = M.soldeCoffre(etat);
  const [nom, setNom] = useState(etat.coffre.nom);
  const [objectif, setObjectif] = useState(String(etat.coffre.objectif / 100));
  const [retrait, setRetrait] = useState('');
  const progression = Math.min(1, solde / etat.coffre.objectif);
  const montantRetrait = retrait ? M.lireMontant(retrait) : solde;
  const objectifLu = M.lireMontant(objectif);

  return (
    <>
      <section className="heros compact coffre-heros">
        <p className="etiquette">Épargné</p>
        <p className="solde">{M.formatEuros(solde)}</p>
        <div className="jauge claire"><div style={{ width: `${progression * 100}%` }} /></div>
        <p className="etiquette">{progression >= 1 ? 'Objectif atteint 🎉' : `${Math.round(progression * 100)} % de ${M.formatEuros(etat.coffre.objectif)}`}</p>
      </section>
      <p className="discret">
        Alimentez le coffre depuis « Utiliser mon cashback » sur l'accueil, ou automatiquement dans les réglages (versement automatique, arrondis).
        {etat.coffre.arrondis.length > 0 && ` Dont ${M.formatEuros(etat.coffre.arrondis.reduce((x, a) => x + a.montant, 0))} d'arrondis sur ${etat.coffre.arrondis.length} achat${etat.coffre.arrondis.length > 1 ? 's' : ''}.`}
      </p>

      <form
        className="carte formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (montantRetrait && modifier((s, tt) => M.retirerCoffre(s, tt, montantRetrait))) {
            signaler(`${M.formatEuros(montantRetrait)} retirés vers votre compte Parnassa`);
            setRetrait('');
          }
        }}
      >
        <b>Retirer vers le compte Parnassa</b>
        <input className="champ" inputMode="decimal" placeholder={`Montant (tout : ${M.formatEuros(solde)})`} value={retrait} onChange={(e) => setRetrait(e.target.value)} aria-label="Montant à retirer" />
        <button className="bouton secondaire" disabled={!solde || !montantRetrait || montantRetrait > solde}>Retirer</button>
      </form>

      <form
        className="carte formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (objectifLu && modifier((s) => M.reglerCoffre(s, nom, objectifLu))) signaler('Coffre mis à jour');
        }}
      >
        <b>Personnaliser</b>
        <input className="champ" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={40} aria-label="Nom du coffre" />
        <input className="champ" inputMode="decimal" value={objectif} onChange={(e) => setObjectif(e.target.value)} aria-label="Objectif en euros" aria-invalid={!objectifLu} />
        <button className="bouton secondaire" disabled={!nom.trim() || !objectifLu}>Enregistrer</button>
      </form>

      {etat.coffre.retraits.length > 0 && (
        <p className="discret">Dernier retrait : {M.formatEuros(etat.coffre.retraits[0].montant)} le {date.format(etat.coffre.retraits[0].date)}.</p>
      )}
    </>
  );
}

function Cartes({ etat, modifier, signaler, ouvrirUtiliser }: Contexte) {
  const [voir, setVoir] = useState<string | null>(null);
  return (
    <>
      <button className="bouton" onClick={ouvrirUtiliser}>Créer une carte cadeau</button>
      {etat.cartes.length === 0 && <p className="vide">Aucune carte cadeau pour l'instant.</p>}
      <ul className="liste">
        {etat.cartes.map((c) => {
          const m = trouverMarchand(c.marchandId)!;
          return (
            <li key={c.id} className={`carte-cadeau ${c.utilisee ? 'utilisee' : ''}`} style={{ ['--teinte' as string]: m.couleur }}>
              <div className="ligne-titre">
                <span className="carte-marchand"><Logo marchand={m} taille={32} /> <b>{m.nom}</b></span>
                <b className="carte-valeur">{M.formatEuros(c.valeur)}</b>
              </div>
              <button className="code-carte" onClick={() => setVoir(voir === c.id ? null : c.id)} aria-label={voir === c.id ? 'Masquer le code' : 'Afficher le code'}>
                {voir === c.id ? c.code : '•••• •••• •••• ' + c.code.slice(-4)}
              </button>
              <div className="ligne-titre">
                <span className="petit-texte">Payée {M.formatEuros(c.paye)} · {date.format(c.date)}</span>
                <span className="rangee">
                  {voir === c.id && (
                    <button
                      className="puce"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(c.code);
                          signaler('Code copié');
                        } catch {
                          signaler("Copie impossible : notez le code à l'écran");
                        }
                      }}
                    >
                      Copier
                    </button>
                  )}
                  <button className="puce" onClick={() => modifier((e) => marquerCarte(e, c.id, !c.utilisee))}>
                    {c.utilisee ? 'Réactiver' : 'Marquer utilisée'}
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Reclamations({ etat, t, modifier, signaler }: Contexte) {
  const [marchandId, setMarchandId] = useState(MARCHANDS[0].id);
  const [saisie, setSaisie] = useState('');
  const aujourdhui = new Date(t);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [jourAchat, setJourAchat] = useState(iso(aujourdhui));
  const montant = M.lireMontant(saisie);
  const STATUTS = { en_etude: 'En étude', acceptee: 'Acceptée', refusee: 'Refusée' } as const;

  return (
    <>
      <p className="discret">
        Vous avez payé chez un partenaire mais le cashback n'apparaît pas ? Signalez-le dans les {M.ANCIENNETE_RECLAMATION_JOURS} jours. Réponse sous {M.DELAI_RECLAMATION_JOURS} jours.
      </p>
      <form
        className="carte formulaire"
        onSubmit={(e) => {
          e.preventDefault();
          if (!montant) return;
          const [a, m, j] = jourAchat.split('-').map(Number);
          const quand = new Date(a, m - 1, j, 12).getTime();
          if (modifier((s, tt) => M.declarerReclamation(s, marchandId, montant, Math.min(quand, tt), tt))) {
            signaler('Réclamation envoyée');
            setSaisie('');
          }
        }}
      >
        <select className="champ" value={marchandId} onChange={(e) => setMarchandId(e.target.value)} aria-label="Marchand">
          {MARCHANDS.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <div className="rangee">
          <input className="champ" type="date" value={jourAchat} max={iso(aujourdhui)} min={iso(new Date(t - M.ANCIENNETE_RECLAMATION_JOURS * M.JOUR))} onChange={(e) => setJourAchat(e.target.value)} aria-label="Date de l'achat" />
          <input className="champ" inputMode="decimal" placeholder="Montant €" value={saisie} onChange={(e) => setSaisie(e.target.value)} aria-label="Montant de l'achat" aria-invalid={saisie !== '' && !montant} />
        </div>
        <button className="bouton" disabled={!montant || !jourAchat}>Envoyer la réclamation</button>
      </form>
      <ul className="liste">
        {etat.reclamations.map((r) => {
          const m = trouverMarchand(r.marchandId)!;
          const restant = Math.ceil((r.decisionLe - t) / M.JOUR);
          return (
            <li key={r.id} className="operation">
              <Logo marchand={m} taille={38} />
              <div className="offre-texte">
                <b>{m.nom} · {M.formatEuros(r.montant)}</b>
                <span className="discret">
                  Achat du {date.format(r.dateAchat)}
                  {r.statut === 'en_etude' && ` · réponse dans ${restant} j`}
                  {r.motif && ` · ${r.motif}`}
                </span>
              </div>
              <span className={`statut ${r.statut === 'acceptee' ? 'disponible' : r.statut === 'refusee' ? 'annule' : 'en_attente'}`}>{STATUTS[r.statut]}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Reglages({ etat, modifier, signaler }: Contexte) {
  const r = etat.reglages;
  const [seuil, setSeuil] = useState(r.autoSeuil ? String(r.autoSeuil / 100) : '20');
  const seuilLu = M.lireMontant(seuil);
  const permission = typeof Notification === 'undefined' ? 'indisponible' : Notification.permission;

  return (
    <>
      <section className="carte">
        <b>Thème</b>
        <div className="segments trois" role="radiogroup" aria-label="Thème">
          {(['auto', 'clair', 'sombre'] as const).map((th) => (
            <button key={th} role="radio" aria-checked={r.theme === th} className={r.theme === th ? 'actif' : ''} onClick={() => modifier((e) => M.regler(e, { theme: th }))}>
              {th === 'auto' ? 'Automatique' : th === 'clair' ? 'Clair' : 'Sombre'}
            </button>
          ))}
        </div>
      </section>

      <section className="carte">
        <label className="interrupteur">
          <span className="offre-texte">
            <b>Versement automatique</b>
            <span className="discret">Tout le disponible part dès qu'il atteint le seuil.</span>
          </span>
          <input
            type="checkbox"
            aria-label="Versement automatique"
            checked={r.autoSeuil !== null}
            onChange={(e) => {
              if (!e.target.checked) modifier((s) => M.regler(s, { autoSeuil: null }));
              else if (seuilLu && modifier((s) => M.regler(s, { autoSeuil: seuilLu }))) signaler(`Versement automatique dès ${M.formatEuros(seuilLu)}`);
            }}
          />
        </label>
        <p className="discret">Réglez le seuil et la destination, puis activez.</p>
        <div className="rangee">
          <input className="champ" inputMode="decimal" value={seuil} onChange={(e) => setSeuil(e.target.value)} aria-label="Seuil en euros" aria-invalid={!seuilLu || seuilLu < M.VERSEMENT_MINIMUM} />
          {r.autoSeuil !== null && (
            <button className="bouton secondaire" style={{ width: 'auto' }} disabled={!seuilLu || seuilLu === r.autoSeuil} onClick={() => seuilLu && modifier((s) => M.regler(s, { autoSeuil: seuilLu })) && signaler('Seuil enregistré')}>
              OK
            </button>
          )}
        </div>
        <div className="segments" role="radiogroup" aria-label="Destination">
          {(['compte', 'coffre'] as const).map((d) => (
            <button key={d} role="radio" aria-checked={r.autoDestination === d} className={r.autoDestination === d ? 'actif' : ''} onClick={() => modifier((s) => M.regler(s, { autoDestination: d }))}>
              {d === 'compte' ? 'Compte Parnassa' : etat.coffre.nom}
            </button>
          ))}
        </div>
      </section>

      <section className="carte">
        <label className="interrupteur">
          <span className="offre-texte">
            <b>Arrondis vers le coffre</b>
            <span className="discret">Chaque achat est arrondi à l'euro supérieur : 12,34 € → 0,66 € mis de côté dans « {etat.coffre.nom} ».</span>
          </span>
          <input
            type="checkbox"
            aria-label="Arrondis vers le coffre"
            checked={r.arrondi}
            onChange={(e) => modifier((s) => M.regler(s, { arrondi: e.target.checked })) && signaler(e.target.checked ? 'Arrondis activés' : 'Arrondis désactivés')}
          />
        </label>
      </section>

      <section className="carte">
        <label className="interrupteur">
          <span className="offre-texte">
            <b>Notifications du navigateur</b>
            <span className="discret">
              {permission === 'denied' ? 'Bloquées dans les réglages du navigateur.' : permission === 'indisponible' ? 'Non prises en charge sur cet appareil.' : 'Cashback disponible, défis réussis, boosts.'}
            </span>
          </span>
          <input
            type="checkbox"
            aria-label="Notifications du navigateur"
            disabled={permission === 'denied' || permission === 'indisponible'}
            checked={r.notifications && permission === 'granted'}
            onChange={async (e) => {
              if (!e.target.checked) return void modifier((s) => M.regler(s, { notifications: false }));
              const reponse = await Notification.requestPermission();
              if (reponse === 'granted') {
                // Seuls les événements à venir seront signalés.
                modifier((s, tt) => ({ ...M.regler(s, { notifications: true }), notificationsEnvoyees: tt }));
                signaler('Notifications activées');
              } else signaler('Notifications refusées');
            }}
          />
        </label>
      </section>

      <section className="carte">
        <b>Mes données</b>
        <p className="discret">Tout est enregistré sur cet appareil uniquement.</p>
        <button className="bouton secondaire" onClick={() => telecharger(`parnassa-cashback-${new Date().toISOString().slice(0, 10)}.csv`, historiqueCsv(etat))}>
          Exporter l'historique (CSV)
        </button>
        <div className="rangee">
          <button className="bouton secondaire" onClick={() => telecharger(`parnassa-cashback-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, exporterSauvegarde(etat, Date.now()), 'application/json')}>
            Sauvegarder
          </button>
          <label className="bouton secondaire fichier">
            Restaurer…
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const fichier = e.target.files?.[0];
                e.target.value = '';
                if (!fichier) return;
                try {
                  const restaure = lireSauvegarde(await fichier.text());
                  const n = restaure.achats.length;
                  if (confirm(`Remplacer toutes les données de cet appareil par la sauvegarde (${n} achat${n > 1 ? 's' : ''}) ?`)) {
                    modifier(() => restaure);
                    signaler('Sauvegarde restaurée');
                  }
                } catch (err) {
                  signaler((err as Error).message);
                }
              }}
            />
          </label>
        </div>
        <p className="petit-texte">La sauvegarde permet de retrouver vos données sur un autre appareil ou navigateur.</p>
      </section>
    </>
  );
}

function Demo({ modifier }: Contexte) {
  return (
    <section className="carte demo">
      <b>Mode démonstration</b>
      <p className="discret">Faites avancer l'horloge pour voir le cashback se débloquer et les réclamations aboutir.</p>
      <div className="rangee">
        <button className="bouton secondaire" onClick={() => modifier((e) => M.avancerTemps(e, 7))}>+7 jours</button>
        <button className="bouton secondaire" onClick={() => modifier((e) => M.avancerTemps(e, 30))}>+30 jours</button>
        <button
          className="bouton secondaire"
          onClick={() => {
            if (confirm('Effacer toutes les données de démonstration ?')) modifier(() => ({ ...M.etatInitial(), accueilVu: true }));
          }}
        >
          Réinitialiser
        </button>
      </div>
    </section>
  );
}

function Dons({ etat, ouvrirUtiliser }: Contexte) {
  const dons = etat.versements.filter((v) => v.destination === 'don');
  const total = dons.reduce((x, v) => x + v.montant, 0);
  const parAssociation = (id: string) => dons.filter((v) => v.associationId === id).reduce((x, v) => x + v.montant, 0);
  return (
    <>
      <section className="heros compact dons-heros">
        <p className="etiquette">Vous avez donné</p>
        <p className="solde">{M.formatEuros(total)}</p>
        <p className="etiquette">{dons.length ? `en ${dons.length} don${dons.length > 1 ? 's' : ''}` : 'Votre cashback peut aussi aider les autres'}</p>
      </section>
      <button className="bouton" onClick={ouvrirUtiliser}>Faire un don</button>
      <ul className="liste">
        {ASSOCIATIONS.map((a) => (
          <li key={a.id} className="offre">
            <span className="logo" style={{ width: 44, height: 44, background: a.couleur, fontSize: 22 }}>{a.icone}</span>
            <div className="offre-texte">
              <b>{a.nom}</b>
              <span className="discret">{a.cause} · {a.description}</span>
            </div>
            <span className="montant">{parAssociation(a.id) ? M.formatEuros(parAssociation(a.id)) : ''}</span>
          </li>
        ))}
      </ul>
      {total > 0 && (
        <p className="petit-texte">
          Pour des associations d'intérêt général, {M.formatEuros(total)} de dons ouvriraient droit à {M.formatEuros(Math.round(total * TAUX_REDUCTION))} de réduction d'impôt. Associations fictives de démonstration : aucun reçu fiscal n'est émis.
        </p>
      )}
      {dons.length > 0 && (
        <ul className="liste">
          {dons.slice(0, 10).map((v) => (
            <li key={v.id} className="operation">
              <span className="notif-icone" aria-hidden>{trouverAssociation(v.associationId)?.icone ?? '💝'}</span>
              <div className="offre-texte">
                <b>{trouverAssociation(v.associationId)?.nom ?? 'Association'}</b>
                <span className="discret">{date.format(v.date)}</span>
              </div>
              <span className="montant">{M.formatEuros(v.montant)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
