import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import type { Outcome } from '../../lib/types';

type Variant = Outcome | 'neutral' | 'amber' | 'success' | 'warn' | 'live';

// Literal class strings so Tailwind can see them (no template-built class names).
const VARIANTS: Record<Variant, string> = {
  sustained: 'text-flame border-flame/45 bg-flame/14',
  extinguished: 'text-blue border-blue-badge/60 bg-blue-badge/18',
  transition: 'text-violet border-violet-badge/60 bg-violet-badge/18',
  partial: 'text-warn border-warn/45 bg-warn/12',
  neutral: 'text-dim border-border bg-panel',
  amber: 'text-amber border-amber/45 bg-amber/12',
  success: 'text-success border-success/40 bg-success/10',
  warn: 'text-warn border-warn/45 bg-warn/12',
  live: 'text-success border-success/40 bg-success/10',
};

const DEFAULT_TEXT: Partial<Record<Variant, string>> = {
  sustained: 'Sustained',
  extinguished: 'Extinguished',
  transition: 'Transition',
  partial: 'Partial',
  live: 'Live retrieval',
};

interface BadgeProps {
  variant?: Variant;
  /** Defaults to the outcome name (or "Live retrieval" for `live`). */
  children?: ReactNode;
  className?: string;
}

/** Outcome badges + status pills. `live` = the blinking LIVE RETRIEVAL indicator. */
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'console-label inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 tracking-[0.1em]',
        VARIANTS[variant],
        className,
      )}
    >
      {variant === 'live' && <span aria-hidden className="anim-blink size-1.5 rounded-full bg-current" />}
      {children ?? DEFAULT_TEXT[variant]}
    </span>
  );
}
