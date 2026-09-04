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
      className={`relative h-8 w-14 shrink-0 rounded-md border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B] ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-white/[0.04]"
          : checked
            ? "border-[#2563EB] bg-[#2563EB]"
            : "border-white/15 bg-white/[0.06] hover:border-white/25"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-sm shadow-sm transition-all duration-150 ${
          disabled
            ? "left-1 bg-white/20"
            : checked
              ? "left-7 bg-white"
              : "left-1 bg-white/80"
        }`}
      />
    </button>
  );
}