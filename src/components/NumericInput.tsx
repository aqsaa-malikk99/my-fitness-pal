import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";

export type NumericInputProps = {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Defaults to 1. Values &lt; 1 allow decimal entry. */
  step?: number;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

function clamp(n: number, min?: number, max?: number): number {
  let x = n;
  if (min !== undefined) x = Math.max(min, x);
  if (max !== undefined) x = Math.min(max, x);
  return x;
}

function formatDisplay(n: number, allowDecimals: boolean): string {
  if (!Number.isFinite(n)) return "";
  if (!allowDecimals) return String(Math.round(n));
  return String(n);
}

function parseValue(raw: string, allowDecimals: boolean): number | null {
  const t = raw.trim();
  if (t === "" || t === "-" || t === ".") return null;
  const n = allowDecimals ? parseFloat(t) : parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Text-based numeric field so clearing and backspace behave naturally (no forced 0 or "021" glitches from
 * `type="number"` + `Number(e.target.value)`).
 */
export default function NumericInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  ...rest
}: NumericInputProps) {
  const allowDecimals = step < 1;
  const [text, setText] = useState(() => formatDisplay(value, allowDecimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatDisplay(value, allowDecimals));
  }, [value, allowDecimals]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const n = parseValue(raw, allowDecimals);
    if (n !== null) onValueChange(n);
  };

  const onBlur = (_e: FocusEvent<HTMLInputElement>) => {
    focused.current = false;
    const n = parseValue(text, allowDecimals);
    if (n === null) {
      setText(formatDisplay(value, allowDecimals));
      return;
    }
    const c = clamp(n, min, max);
    onValueChange(c);
    setText(formatDisplay(c, allowDecimals));
  };

  const onFocus = () => {
    focused.current = true;
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      autoComplete="off"
      value={text}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
    />
  );
}
