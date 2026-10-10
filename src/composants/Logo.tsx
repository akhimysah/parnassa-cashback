import type { Marchand } from '../marchands';

export function Logo({ marchand, taille = 44 }: { marchand?: Marchand; taille?: number }) {
  const initiales = marchand ? marchand.nom.split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase() : '💳';
  return (
    <span className="logo" style={{ width: taille, height: taille, background: marchand?.couleur ?? 'var(--surface-2)', fontSize: taille * 0.36 }}>
      {initiales}
    </span>
  );
}
