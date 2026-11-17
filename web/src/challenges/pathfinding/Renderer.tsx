import type { PathfindingState } from './environment';
import styles from './Renderer.module.css';

export function PathfindingRenderer({ state }: { state: PathfindingState }) {
  const rows = state.grid.length;
  const cols = state.grid[0]?.length ?? 0;
  const keyOf = (x: number, y: number) => `${x},${y}`;
  const discovered = new Set(state.discovered.map((c) => keyOf(c.x, c.y)));
  const visited = new Set(state.visited.map((c) => keyOf(c.x, c.y)));
  const path = new Set(state.path.map((c) => keyOf(c.x, c.y)));

  const classFor = (x: number, y: number): string => {
    const k = keyOf(x, y);
    if (state.grid[y]![x] === '#') return styles.obstacle!;
    if (x === state.start.x && y === state.start.y) return styles.start!;
    if (x === state.end.x && y === state.end.y) return styles.end!;
    if (path.has(k)) return styles.path!;
    if (visited.has(k)) return styles.visited!;
    if (discovered.has(k)) return styles.frontier!;
    return '';
  };

  return (
    <div className={styles.wrapper} style={{ width: `min(100cqw, calc((100cqh - 36px) * ${cols} / ${rows}), 820px)` }}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}
      >
        {state.grid.flatMap((row, y) =>
          [...row].map((_, x) => <div key={keyOf(x, y)} className={`${styles.cell} ${classFor(x, y)}`} />),
        )}
      </div>
      <ul className={styles.legend}>
        <li data-kind="frontier">Explored</li>
        <li data-kind="visited">Visited</li>
        <li data-kind="path">Path</li>
      </ul>
    </div>
  );
}
