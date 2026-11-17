import { challengeRegistry } from '@/core/challenges/registry';
import { ChallengeCarousel } from '@/components/ChallengeCarousel/ChallengeCarousel';
import { AppShell } from '@/app/AppShell';
import styles from './ChallengeExplorer.module.css';

export function ChallengeExplorer() {
  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.hero}>
          <h1>Write code. Watch it act.</h1>
          <p>Pick a challenge, write a real program and see it interact with the environment step by step.</p>
        </div>
        <ChallengeCarousel challenges={challengeRegistry} />
      </div>
    </AppShell>
  );
}
