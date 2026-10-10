import { useEffect, useRef, type ReactNode } from 'react';

/** Panneau modal qui monte du bas de l'écran (centré sur ordinateur). */
export function Feuille({ fermer, titre, teinte, children }: { fermer: () => void; titre?: string; teinte?: string; children: ReactNode }) {
  const dialogue = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Pas de close() au démontage : en mode strict, React rejoue l'effet et la fermeture refermerait le panneau.
    if (!dialogue.current?.open) dialogue.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogue}
      className="fiche"
      aria-label={titre}
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && dialogue.current.close()}
    >
      <div className="fiche-corps" style={teinte ? { ['--teinte' as string]: teinte } : undefined}>
        <button className="fermer" onClick={() => dialogue.current?.close()} aria-label="Fermer">×</button>
        {titre && <h2 className="fiche-titre">{titre}</h2>}
        {children}
      </div>
    </dialog>
  );
}
