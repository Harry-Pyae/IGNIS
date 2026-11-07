import type { SVGProps } from 'react';

/**
 * IGNIS icon set — monotone stroke SVGs, 24×24, stroke 1.75, currentColor.
 * Usage: <Icon name="flame" /> · size via `size` (px). Decorative by default (aria-hidden);
 * pass `label` to make it a meaningful image.
 */
const paths = {
  flame: (
    <path d="M12 3c.6 2.8 4.5 4.6 4.5 9.2a4.5 4.5 0 0 1-9 0c0-1.9.8-3.2 1.8-4.1.2 1.5.9 2.4 1.9 2.7C10.6 8.6 10.9 5.6 12 3Z" />
  ),
  'flame-sphere': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5c.3 1.4 2.3 2.3 2.3 4.6a2.3 2.3 0 0 1-4.6 0c0-1 .4-1.6.9-2 .1.7.4 1.2 1 1.3-.2-1.6 0-3 .4-3.9Z" />
    </>
  ),
  scenario: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  'map-scatter': (
    <>
      <path d="M4 4v16h16" />
      <circle cx="9" cy="14" r="1.2" />
      <circle cx="12.5" cy="9.5" r="1.2" />
      <circle cx="16.5" cy="12" r="1.2" />
      <circle cx="17.5" cy="6.5" r="1.2" />
    </>
  ),
  match: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  evidence: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 14l2 2 4-4" />
    </>
  ),
  citation: <path d="M8 4H5v16h3M16 4h3v16h-3M10 10h4M10 14h4" />,
  gap: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12 12 4M4 20 20 4M12 20l8-8" />
    </>
  ),
  export: <path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  telemetry: (
    <>
      <path d="M4 4v16h16" />
      <path d="M7 15c1.5 0 2-6 3.5-6s2 8 3.5 8 2-11 3.5-11" />
    </>
  ),
  slider: (
    <>
      <path d="M4 12h16" />
      <circle cx="14" cy="12" r="2.6" />
      <path d="M4 7h3M4 17h3" />
    </>
  ),
  provenance: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M6 8v8M8 6h3a5 5 0 0 1 5 5M8 18h3a5 5 0 0 0 5-5" />
    </>
  ),
  campaign: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  verify: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16 10" />
    </>
  ),
  withheld: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3Z" />
    </>
  ),
  play: <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
} as const;

export type IconName = keyof typeof paths;
export const ICON_NAMES = Object.keys(paths) as IconName[];

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Accessible name. Omit for decorative icons next to visible text. */
  label?: string;
}

export function Icon({ name, size = 18, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
