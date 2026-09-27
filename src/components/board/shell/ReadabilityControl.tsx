import { useEffect, useState } from "react";

type Readability = "compact" | "standard" | "large";

const OPTIONS: Array<{ value: Readability; label: string; short: string }> = [
  { value: "compact", label: "Compact text", short: "A−" },
  { value: "standard", label: "Standard text", short: "A" },
  { value: "large", label: "Large text", short: "A+" },
];

const STORAGE_KEY = "hegemony-readability";

export function ReadabilityControl() {
  const [value, setValue] = useState<Readability>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return OPTIONS.some((option) => option.value === stored)
        ? (stored as Readability)
        : "standard";
    } catch {
      return "standard";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.readability = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Readability still applies for this session when storage is unavailable.
    }
  }, [value]);

  return (
    <fieldset className="readabilityControl" aria-label="Text size">
      <legend className="visuallyHidden">Text size</legend>
      {OPTIONS.map((option) => (
        <button
          aria-label={option.label}
          aria-pressed={value === option.value}
          className="readabilityChoice label"
          key={option.value}
          onClick={() => setValue(option.value)}
          title={option.label}
          type="button"
        >
          {option.short}
        </button>
      ))}
    </fieldset>
  );
}
