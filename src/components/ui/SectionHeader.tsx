import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

interface SectionHeaderProps {
  /** Mono step tag, e.g. "01 · DESCRIBE". */
  step: string;
  /** e.g. "Mission scenario" — rendered uppercase. */
  title: string;
  /** Optional right-side slot (badges, actions). */
  aside?: ReactNode;
  id?: string;
  className?: string;
}

/** §8.3 section header pattern: `MISSION SCENARIO` + mono step tag `01 · DESCRIBE`. */
export function SectionHeader({ step, title, aside, id, className }: SectionHeaderProps) {
  return (
    <header
      className={cx('mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4', className)}
    >
      <div className="flex flex-col gap-1.5">
        <span className="console-label text-amber">{step}</span>
        <h2 id={id} className="text-[15px] font-semibold tracking-[0.08em] text-text uppercase">
          {title}
        </h2>
      </div>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </header>
  );
}
