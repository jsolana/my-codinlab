import type { CSSProperties } from 'react';
import type { Difficulty } from '@/core/challenges/types';
import styles from './Badges.module.css';

const TONES: Record<Difficulty, string> = {
  Easy: 'var(--easy)',
  Medium: 'var(--medium)',
  Hard: 'var(--hard)',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={styles.badge} style={{ '--tone': TONES[difficulty] } as CSSProperties}>
      {difficulty}
    </span>
  );
}

export function ConceptTag({ children }: { children: string }) {
  return <span className={styles.tag}>{children}</span>;
}
