import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { FlameSphereArt } from './FlameSphereArt';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  icon?: IconName;
  /**
   * App-level loading/empty states only. NEVER inside the Evidence Map, Match Panel or
   * Mission Brief — those surfaces are reserved for data and real NASA material.
   */
  illustration?: boolean;
  className?: string;
}

export function EmptyState({ title, children, icon = 'search', illustration, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {illustration ? (
        <FlameSphereArt size={96} />
      ) : (
        <span className="grid size-11 place-items-center rounded-full border border-border text-faint">
          <Icon name={icon} size={20} />
        </span>
      )}
      <p className="text-[15px] font-medium text-text">{title}</p>
      {children && <div className="max-w-sm text-sm text-dim">{children}</div>}
    </div>
  );
}
