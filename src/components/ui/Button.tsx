import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary text-bg font-semibold',
  secondary:
    'border border-border bg-panel/70 text-text shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text)_6%,transparent)] can-hover:hover:border-raised can-hover:hover:bg-panel',
  ghost: 'text-dim can-hover:hover:text-text can-hover:hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2.5 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  /** The guided-demo glow (2.6s). Use on ONE button per screen. */
  glow?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  glow,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 15 : 17;
  return (
    <button
      type={type}
      className={cx(
        'pressable inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,filter,transform] duration-[180ms] ease-[var(--ease-out)]',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        glow && 'anim-glow',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
