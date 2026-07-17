"use client";

export function PreferenceMultiSelect<T extends string>({
  legend,
  values,
  selected,
  onChange,
  disabledValues = [],
}: {
  legend: string;
  values: readonly T[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
  disabledValues?: readonly T[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[12px] font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const checked = selected.includes(value);
          const disabled = disabledValues.includes(value);
          return (
            <label
              key={value}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] cursor-pointer ${
                checked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...new Set([...selected, value])]
                      : selected.filter((item) => item !== value),
                  )
                }
              />
              {value.replaceAll("_", " ")}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
