import { useId, type SelectHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Icon } from './Icon';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: readonly { value: string; label: string }[];
  /** Shown as the first, empty option (e.g. "Select a catalog material"). */
  placeholder?: string;
  hideLabel?: boolean;
}

/** Native select (keyboard + mobile pickers for free), token-styled. */
export function Select({ label, options, placeholder, hideLabel, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className={cx('console-label text-dim', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className="h-10 w-full appearance-none rounded-xl border border-border bg-bg/70 pr-9 pl-3 text-[15px] text-text transition-colors duration-150 can-hover:hover:border-raised sm:text-sm"
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint" />
      </div>
    </div>
  );
}
