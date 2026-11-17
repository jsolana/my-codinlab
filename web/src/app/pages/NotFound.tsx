import { AppShell } from '@/app/AppShell';
import { paths } from '@/app/routing/router';

export function NotFound() {
  return (
    <AppShell>
      <div style={{ padding: '64px 24px', maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28 }}>Challenge not found</h1>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 24px' }}>That page does not exist.</p>
        <a href={`#${paths.explorer()}`} style={{ color: 'var(--accent-strong)' }}>
          ← Back to all challenges
        </a>
      </div>
    </AppShell>
  );
}
