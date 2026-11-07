import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import type { ChipStatus } from '../../lib/types';

/**
 * Fixed symbol language (§5c, §8.3) — never change a symbol's meaning:
 * ✓ same/exact · ≈ close/class · ≠ different · ⚠ not reported (the card) · ∅ untested (no catalog
 * evidence) · ⇥ outside catalog range · – not specified (the scenario). ⚠, ∅ and ⇥ are distinct
 * states and must never look alike. `text` values are the English defaults; pass `statusText`
 * (and `label`) from Part 3's t() helper to localize without forking.
 */
export const CHIP_STATUS: Record<ChipStatus, { symbol: string; text: string; className: string }> = {
  exact: { symbol: '✓', text: 'exact', className: 'text-success border-success/35' },
  same: { symbol: '✓', text: 'same', className: 'text-success border-success/35' },
  class: { symbol: '≈', text: 'same class', className: 'text-warn border-warn/35' },
  close: { symbol: '≈', text: 'close', className: 'text-warn border-warn/35' },
  different: { symbol: '≠', text: 'different', className: 'text-dim border-border' },
  not_reported: { symbol: '⚠', text: 'not reported', className: 'text-dim border-border' },
  untested: { symbol: '∅', text: 'untested', className: 'text-dim border-border [&>[aria-hidden]]:text-faint' },
  outside_range: { symbol: '⇥', text: 'outside catalog range', className: 'text-text border-dashed border-raised' },
  not_specified: { symbol: '–', text: 'not specified', className: 'text-dim border-border border-dotted' },
};

interface ChipProps {
  status: ChipStatus;
  /** Parameter name, e.g. "Oxygen" → "✓ Oxygen: same". Omit to show the status alone. */
  label?: string;
  /** Localized status words (default: English CHIP_STATUS text). */
  statusText?: string;
  className?: string;
}

/** Parameter chip — WHY THIS MATCHED rows and the scenario chips row. */
export function Chip({ status, label, statusText, className }: ChipProps) {
  const s = CHIP_STATUS[status];
  const text = statusText ?? s.text;
  return (
    <span
      className={cx(
        'console-label inline-flex max-w-full items-center gap-1.5 rounded-md border bg-bg/60 px-2 py-1 tracking-[0.08em] break-words',
        s.className,
        className,
      )}
    >
      <span aria-hidden className="font-sans text-[13px] leading-none">
        {s.symbol}
      </span>
      {label ? `${label}: ${text}` : text}
    </span>
  );
}

interface PresetChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Pill preset chip — active = amber border (§8.3). */
export function PresetChip({ active, className, type = 'button', ...rest }: PresetChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'pressable inline-flex min-h-9 items-center gap-2 rounded-full border px-4 py-1.5 text-left text-[13px] transition-colors duration-150',
        active
          ? 'border-amber bg-amber/10 text-text'
          : 'border-border bg-panel/70 text-dim can-hover:hover:border-raised can-hover:hover:text-text',
        className,
      )}
      {...rest}
    />
  );
}

interface CitationChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** "E3" → renders [E3]. Render only AFTER server validation passed (§7.3). */
  evidenceId: string;
  /** Accessible name (default "Evidence E3"). Localize via Part 3's t(). */
  label?: string;
}

/**
 * Bordered amber citation chip [E3] → scrolls to / highlights the evidence card.
 * Lives inside the Mission Brief, so it NEVER moves: no press-scale, even with motion enabled.
 */
export function CitationChip({ evidenceId, label, className, type = 'button', ...rest }: CitationChipProps) {
  return (
    <button
      type={type}
      aria-label={label ?? `Evidence ${evidenceId}`}
      className={cx(
        'inline-flex h-6 touch-manipulation items-center rounded-md border border-amber/60 px-1.5 font-mono text-[11px] font-medium text-amber',
        'can-hover:hover:bg-amber/12',
        className,
      )}
      {...rest}
    >
      [{evidenceId}]
    </button>
  );
}
