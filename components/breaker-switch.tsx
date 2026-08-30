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
      className={`relative h-8 w-14 shrink-0 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4D42] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
        disabled
          ? "cursor-not-allowed border-[#E1DFD6] bg-[#F1F0EB]"
          : checked
            ? "border-[#1F4D42] bg-[#1F4D42]"
            : "border-[#DEDCD3] bg-[#FBFAF7] hover:border-[#B9C4BF]"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-sm shadow-sm transition-all duration-150 ${
          disabled
            ? "left-1 bg-[#D8D6CC]"
            : checked
              ? "left-7 bg-[#C98A2C]"
              : "left-1 bg-white"
        }`}
      />
    </button>
  );
}
