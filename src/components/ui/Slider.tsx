import { useId, type CSSProperties } from 'react';
import { cx } from '../../lib/cx';

interface SliderProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  onClear?: () => void;
  allowUnspecified?: boolean;
  unspecifiedValue?: number;
  unspecifiedLabel?: string;
  setValueLabel?: string;
  clearValueLabel?: string;
  className?: string;
}

/**
 * Live parameter slider (§8.1: O₂ 14–30 %, airflow 0–30 cm/s).
 * Semantics: it changes WHICH verified evidence is retrieved — it never paints risk zones.
 * Always pair it with COPY.sliderCaption (src/lib/copy.ts). Native range input: keyboard, touch, a11y for free.
 */
export function Slider({ label, value, min, max, step = 1, unit, onChange, onClear, className, allowUnspecified = false, unspecifiedValue = min, unspecifiedLabel = 'Not specified', setValueLabel = 'Set value', clearValueLabel = 'Clear value' }: SliderProps) {
  const id = useId();
  const currentValue = value ?? min;
  const fill = ((currentValue - min) / (max - min)) * 100;
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="console-label text-dim">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm text-text tabular-nums">
          {value == null && allowUnspecified ? unspecifiedLabel : <>{value}<span className="ml-1 text-dim">{unit}</span></>}
        </output>
        {allowUnspecified && (
          <button type="button" className="text-xs text-dim underline underline-offset-2 hover:text-text" onClick={() => value == null ? onChange(unspecifiedValue) : onClear?.()}>
            {value == null ? setValueLabel : clearValueLabel}
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        className="ignis-range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={allowUnspecified && value == null}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${Math.min(100, Math.max(0, fill))}%` } as CSSProperties}
      />
      <div className="flex justify-between font-mono text-[10px] text-dim tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
