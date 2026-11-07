import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

export type PanelTone = 'default' | 'raised' | 'observed' | 'interpretation' | 'untested';

const TONES: Record<PanelTone, string> = {
  default: 'surface border-border',
  raised: 'surface surface-raised border-raised',
  observed: 'bg-observed-bg surface-tinted border-observed-border',
  interpretation: 'bg-interp-bg surface-tinted border-interp-border',
  untested: 'bg-untested-bg surface-tinted border-untested-border',
};

/** Brief tones are credibility moments: they and everything inside them never move (decision 2). */
const STILL: PanelTone[] = ['observed', 'interpretation', 'untested'];

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article' | 'aside';
  tone?: PanelTone;
  /** Hover lift + amber border (cards). */
  interactive?: boolean;
  padded?: boolean;
}

/** 16px-radius surface on the near-black ground (§8.3): lit from above, translucent, soft shadow. */
export function Panel({ as: Tag = 'div', tone = 'default', interactive, padded = true, className, ...rest }: PanelProps) {
  return (
    <Tag
      className={cx(
        'rounded-panel border',
        TONES[tone],
        padded && 'p-5 sm:p-6',
        STILL.includes(tone) ? 'motion-still' : interactive && 'hover-lift',
        className,
      )}
      {...rest}
    />
  );
}
