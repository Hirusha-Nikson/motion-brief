import { useId, useState, type ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}

function Hint({ id, hint }: { id: string; hint?: ReactNode }) {
  return hint ? (
    <p id={id} className="hint">
      {hint}
    </p>
  ) : null;
}

export function TextField({
  label,
  hint,
  className,
  value,
  onChange,
  maxLength,
  placeholder,
  rows,
  invalid,
}: FieldProps & {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  /** Render a textarea with this many rows. */
  rows?: number;
  invalid?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const common = {
    id,
    value,
    maxLength,
    placeholder,
    "aria-invalid": invalid || undefined,
    "aria-describedby": hint ? hintId : undefined,
  };
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      {rows ? (
        <textarea {...common} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

/** Number input that lets the user clear and retype without losing the stored value. */
export function NumberField({
  label,
  hint,
  className,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled,
}: FieldProps & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="with-suffix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={editing ?? String(value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onFocus={() => setEditing(String(value))}
          onBlur={() => setEditing(null)}
          onChange={(e) => {
            setEditing(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        {suffix ? <span className="suffix">{suffix}</span> : null}
      </div>
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

/** Number input that may be left empty (undefined). */
export function OptionalNumberField({
  label,
  hint,
  className,
  value,
  onChange,
  min,
  max,
  suffix,
  placeholder,
}: FieldProps & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  suffix?: string;
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="with-suffix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={editing ?? (value === undefined ? "" : String(value))}
          min={min}
          max={max}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          onFocus={() => setEditing(value === undefined ? "" : String(value))}
          onBlur={() => setEditing(null)}
          onChange={(e) => {
            setEditing(e.target.value);
            if (e.target.value === "") return onChange(undefined);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
        />
        {suffix ? <span className="suffix">{suffix}</span> : null}
      </div>
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  className,
  value,
  onChange,
  options,
}: FieldProps & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; group?: string }[];
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const groups = [...new Set(options.map((o) => o.group))];
  const render = (opts: typeof options) =>
    opts.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {groups.length > 1
          ? groups.map((g) => (
              <optgroup key={g ?? ""} label={g ?? ""}>
                {render(options.filter((o) => o.group === g))}
              </optgroup>
            ))
          : render(options)}
      </select>
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  label,
  hint,
  className,
  checked,
  onChange,
}: FieldProps & { checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={`field checkbox ${className ?? ""}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorField({
  label,
  hint,
  value,
  onChange,
}: FieldProps & { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [editing, setEditing] = useState<string | null>(null);
  const safe = HEX.test(value) ? value : "#000000";
  return (
    <div className="field color">
      <label htmlFor={id}>{label}</label>
      <div className="color-row">
        <input
          type="color"
          value={safe.toLowerCase()}
          aria-label={`${typeof label === "string" ? label : "Colour"} picker`}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          type="text"
          value={editing ?? value}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!HEX.test(editing ?? value) || undefined}
          aria-describedby={hint ? hintId : undefined}
          onFocus={() => setEditing(value)}
          onBlur={() => setEditing(null)}
          onChange={(e) => {
            const v = e.target.value.trim();
            setEditing(v);
            if (HEX.test(v)) onChange(v.toLowerCase());
          }}
        />
      </div>
      <Hint id={hintId} hint={hint} />
    </div>
  );
}

export function RadioCards<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; detail?: ReactNode }[];
}) {
  return (
    <fieldset className={options.length <= 3 ? "radio-cards wide" : "radio-cards"}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={o.value === value ? "selected" : undefined}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span className="radio-label">{o.label}</span>
          {o.detail ? <span className="radio-detail">{o.detail}</span> : null}
        </label>
      ))}
    </fieldset>
  );
}
