import type { Challenge } from '@/core/challenges/types';
import { paths } from '@/app/routing/router';
import { ClockIcon } from '../icons';
import { ConceptTag, DifficultyBadge } from '../Badges';
import { EnvironmentPreview } from '../EnvironmentPreview';
import styles from './ChallengeCard.module.css';

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { metadata } = challenge;
  return (
    <a className={styles.card} href={`#${paths.preview(challenge.id)}`} data-card>
      <div className={styles.preview}>
        <EnvironmentPreview challenge={challenge} />
      </div>
      <div className={styles.meta}>
        <DifficultyBadge difficulty={metadata.difficulty} />
        <span className={styles.time}>
          <ClockIcon /> ~{metadata.estimatedMinutes} min
        </span>
      </div>
      <h3 className={styles.title}>{metadata.name}</h3>
      <p className={styles.summary}>{metadata.summary}</p>
      <div className={styles.tags}>
        {metadata.concepts.map((concept) => (
          <ConceptTag key={concept}>{concept}</ConceptTag>
        ))}
      </div>
    </a>
  );
}
