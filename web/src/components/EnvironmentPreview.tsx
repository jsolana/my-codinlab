import { useMemo } from 'react';
import type { Challenge } from '@/core/challenges/types';

/** Static, non-interactive snapshot of a challenge's initial environment. */
export function EnvironmentPreview({ challenge }: { challenge: Challenge }) {
  const state = useMemo(() => challenge.environment.reset(), [challenge]);
  const { Renderer } = challenge;
  return (
    <div
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        containerType: 'size',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Renderer state={state} />
    </div>
  );
}
