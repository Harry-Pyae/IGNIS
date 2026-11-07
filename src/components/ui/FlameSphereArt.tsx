import { COPY } from '../../lib/copy';
import { cx } from '../../lib/cx';

/** @deprecated import COPY.illustration from src/lib/copy instead. */
export const ILLUSTRATION_NOTE = COPY.illustration;

interface FlameSphereArtProps {
  size: number;
  /** Show the visible caption (required wherever the art stands alone on a page). */
  caption?: boolean;
  /** Localized disclosure (default: COPY.illustration). Used for both the caption and the alt text. */
  note?: string;
  className?: string;
}

/**
 * Decorative flame-sphere ART (branding only). It is NOT a NASA burn test:
 * never place it on evidence cards, the Evidence Map, the Match Panel or the Mission Brief.
 * The required disclosure is built in: alt text always, visible caption by default.
 */
export function FlameSphereArt({ size, caption = true, note = COPY.illustration, className }: FlameSphereArtProps) {
  return (
    <figure className={cx('flex flex-col items-center gap-2', className)}>
      <img
        src="/art/flame-sphere-sm.webp"
        srcSet="/art/flame-sphere-sm.webp 512w, /art/flame-sphere.webp 1024w"
        sizes={`${size}px`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        alt={note}
        className="rounded-full"
      />
      {caption && <figcaption className="console-label text-center text-dim">{note}</figcaption>}
    </figure>
  );
}
