import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import type { ChipStatus } from '../../lib/types';

/**
 * Fixed symbol language (§5c, §8.3) — never change a symbol's meaning:
 * ✓ same/exact · ≈ close/class · ≠ different · ⚠ not reported · ∅ untested · ⇥ outside catalog range
 * UNTESTED (∅) and OUTSIDE RANGE (⇥) are distinct states and must never look alike.
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
};

interface ChipProps {
  status: ChipStatus;
  /** Parameter name, e.g. "Oxygen" → "✓ Oxygen: same". Omit to show the status alone. */
  label?: string;
  className?: string;
}

/** Parameter chip — WHY THIS MATCHED rows and the scenario chips row. */
export function Chip({ status, label, className }: ChipProps) {
  const s = CHIP_STATUS[status];
  return (
    <span
      className={cx(
        'console-label inline-flex items-center gap-1.5 rounded-md border bg-bg/60 px-2 py-1 tracking-[0.08em]',
        s.className,
        className,
      )}
    >
      <span aria-hidden className="font-sans text-[13px] leading-none">
        {s.symbol}
      </span>
      {label ? `${label}: ${s.text}` : s.text}
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
        'pressable inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors duration-150',
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
}

/** Bordered amber citation chip [E3] → click scrolls to / highlights the evidence card. */
export function CitationChip({ evidenceId, className, type = 'button', ...rest }: CitationChipProps) {
  return (
    <button
      type={type}
      aria-label={`Evidence ${evidenceId}`}
      className={cx(
        'pressable inline-flex h-6 items-center rounded-md border border-amber/60 px-1.5 font-mono text-[11px] font-medium text-amber',
        'can-hover:hover:bg-amber/12',
        className,
      )}
      {...rest}
    >
      [{evidenceId}]
    </button>
  );
}
