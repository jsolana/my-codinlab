import type { SortingState } from './environment';
import styles from './Renderer.module.css';

export function SortingRenderer({ state }: { state: SortingState }) {
  const count = state.bars.length;
  const max = Math.max(...state.bars.map((bar) => bar.value));
  const stateOf = (index: number) => {
    if (state.finished) return styles.sorted;
    if (state.swapped?.includes(index)) return styles.swapped;
    if (state.comparing?.includes(index)) return styles.comparing;
    return '';
  };

  return (
    <div className={styles.stage}>
      <div className={styles.bars}>
        {state.bars.map((bar, index) => (
          <div
            key={bar.id}
            className={styles.slot}
            style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)` }}
          >
            <div className={`${styles.bar} ${stateOf(index)}`} style={{ height: `${(bar.value / max) * 100}%` }}>
              <span>{bar.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.stats}>
        <span>
          Comparisons <b>{state.comparisons}</b>
        </span>
        <span>
          Swaps <b>{state.swaps}</b>
        </span>
      </div>
    </div>
  );
}
