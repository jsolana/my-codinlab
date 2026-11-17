import type { LanguageDefinition } from '@/core/challenges/types';
import styles from './LanguageSelector.module.css';

interface Props {
  languages: readonly LanguageDefinition[];
  value: string;
  onChange(languageId: string): void;
  disabled?: boolean;
}

/** Lists only the languages the current challenge supports. */
export function LanguageSelector({ languages, value, onChange, disabled }: Props) {
  return (
    <select
      className={styles.select}
      aria-label="Programming language"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {languages.map((language) => (
        <option key={language.id} value={language.id}>
          {language.label}
        </option>
      ))}
    </select>
  );
}
