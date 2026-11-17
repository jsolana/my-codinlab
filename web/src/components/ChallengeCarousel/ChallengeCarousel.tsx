import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Challenge } from '@/core/challenges/types';
import { ChallengeCard } from '../ChallengeCard/ChallengeCard';
import { Button } from '../Button';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import styles from './ChallengeCarousel.module.css';

export function ChallengeCarousel({ challenges }: { challenges: readonly Challenge[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges, challenges]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = (card?.offsetWidth ?? 340) + 24;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') scrollByCard(1);
    if (event.key === 'ArrowLeft') scrollByCard(-1);
  };

  return (
    <section className={styles.root} aria-roledescription="carousel" aria-label="Challenges">
      <div className={styles.header}>
        <span className={styles.count}>{challenges.length} challenges</span>
        <div className={styles.controls}>
          <Button className={styles.arrow} aria-label="Previous" disabled={edges.start} onClick={() => scrollByCard(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button className={styles.arrow} aria-label="Next" disabled={edges.end} onClick={() => scrollByCard(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <div className={styles.track} ref={track} onScroll={updateEdges} onKeyDown={onKeyDown}>
        {challenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </section>
  );
}
