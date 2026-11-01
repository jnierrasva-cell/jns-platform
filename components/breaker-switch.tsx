"use client";

import { Toggle } from "@/components/ui/switch";

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
    <Toggle
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      disabled={disabled}
    />
  );
}
