import { useState } from 'react';
import type { ChallengeInstructions } from '@/core/challenges/types';
import { ChevronDownIcon } from '../icons';
import styles from './InstructionsPanel.module.css';

function Section({ title, items, code }: { title: string; items: string[]; code?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.section}>
      <h4>{title}</h4>
      <ul className={code ? styles.code : undefined}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Reusable instructions view (collapsible when `collapsible` is set). */
export function InstructionsBody({ instructions }: { instructions: ChallengeInstructions }) {
  return (
    <div className={styles.body}>
      <p className={styles.objective}>{instructions.objective}</p>
      <Section title="Rules" items={instructions.rules} />
      <Section title="Constraints" items={instructions.constraints} />
      <Section title="Agent API" items={instructions.api} code />
    </div>
  );
}

export function InstructionsPanel({ instructions }: { instructions: ChallengeInstructions }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`${styles.panel} ${open ? '' : styles.collapsed}`}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Instructions
        <span className={styles.chevron}>
          <ChevronDownIcon />
        </span>
      </button>
      {open && <InstructionsBody instructions={instructions} />}
    </section>
  );
}
