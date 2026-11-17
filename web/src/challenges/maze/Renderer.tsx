import type { CSSProperties } from 'react';
import type { MazeState } from './environment';
import styles from './Renderer.module.css';

export function MazeRenderer({ state }: { state: MazeState }) {
  const rows = state.grid.length;
  const cols = state.grid[0]?.length ?? 0;
  const cell = (n: number, total: number) => `${(n / total) * 100}%`;
  const sized = (x: number, y: number): CSSProperties => ({
    width: cell(1, cols),
    height: cell(1, rows),
    left: cell(x, cols),
    top: cell(y, rows),
  });

  return (
    <div
      className={styles.board}
      style={
        {
          '--cols': cols,
          '--rows': rows,
          aspectRatio: `${cols} / ${rows}`,
          width: `min(100cqw, calc(100cqh * ${cols} / ${rows}), 820px)`,
        } as CSSProperties
      }
    >
      {state.grid.flatMap((row, y) =>
        [...row].map((char, x) =>
          char === '#' ? <div key={`${x}-${y}`} className={styles.wall} style={sized(x, y)} /> : null,
        ),
      )}
      <div className={styles.goal} style={sized(state.goal.x, state.goal.y)}>
        <span />
      </div>
      {state.blockedAt && (
        <div
          key={`${state.blockedAt.x}-${state.blockedAt.y}-${state.steps}`}
          className={styles.bump}
          style={sized(state.blockedAt.x, state.blockedAt.y)}
        />
      )}
      <div className={styles.player} style={sized(state.position.x, state.position.y)}>
        <span />
      </div>
    </div>
  );
}
