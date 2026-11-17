import type { ReactNode } from 'react';
import { LogoIcon } from '@/components/icons';
import { paths } from './routing/router';
import styles from './AppShell.module.css';

export function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href={`#${paths.explorer()}`}>
          <LogoIcon /> CodinLab
        </a>
        {actions}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
