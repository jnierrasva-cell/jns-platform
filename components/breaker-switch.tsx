"use client";

type BreakerSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
};

export function BreakerSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: BreakerSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-10 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed border-zinc-200 bg-zinc-100"
          : checked
            ? "border-zinc-900 bg-zinc-900"
            : "border-zinc-300 bg-zinc-200 hover:border-zinc-400"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-150 ${
          disabled ? "left-0.5" : checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
