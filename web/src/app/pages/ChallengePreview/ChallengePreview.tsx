import type { Challenge } from '@/core/challenges/types';
import { AppShell } from '@/app/AppShell';
import { navigate, paths } from '@/app/routing/router';
import { Button } from '@/components/Button';
import { ConceptTag, DifficultyBadge } from '@/components/Badges';
import { EnvironmentPreview } from '@/components/EnvironmentPreview';
import { InstructionsBody } from '@/components/InstructionsPanel/InstructionsPanel';
import { ArrowLeftIcon, ClockIcon, PlayIcon } from '@/components/icons';
import styles from './ChallengePreview.module.css';

export function ChallengePreview({ challenge }: { challenge: Challenge }) {
  const { metadata } = challenge;
  return (
    <AppShell>
      <div className={styles.page}>
        <Button variant="ghost" className={styles.back} onClick={() => navigate(paths.explorer())}>
          <ArrowLeftIcon /> All challenges
        </Button>
        <div className={styles.layout}>
          <div>
            <div className={styles.meta}>
              <DifficultyBadge difficulty={metadata.difficulty} />
              <span className={styles.time}>
                <ClockIcon /> ~{metadata.estimatedMinutes} min
              </span>
              <span>{challenge.languages.map((l) => l.label).join(' · ')}</span>
            </div>
            <h1 className={styles.title}>{metadata.name}</h1>
            <p className={styles.description}>{metadata.description}</p>
            <div className={styles.tags}>
              {metadata.concepts.map((concept) => (
                <ConceptTag key={concept}>{concept}</ConceptTag>
              ))}
            </div>
            <div className={styles.cta}>
              <Button variant="primary" size="lg" onClick={() => navigate(paths.playground(challenge.id))}>
                <PlayIcon /> Start Challenge
              </Button>
            </div>
          </div>
          <div className={styles.visual}>
            <div className={styles.frame}>
              <EnvironmentPreview challenge={challenge} />
            </div>
          </div>
        </div>
        <div className={styles.instructions}>
          <InstructionsBody instructions={challenge.instructions} />
        </div>
      </div>
    </AppShell>
  );
}
