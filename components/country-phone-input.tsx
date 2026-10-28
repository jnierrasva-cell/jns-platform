"use client";

import { useState } from "react";
import {
  PHONE_COUNTRIES,
  getDefaultCountryIso,
  joinPhone,
  splitPhone,
} from "@/lib/phone-countries";

export function CountryPhoneInput({
  value,
  onChange,
  disabled,
}: {
  /** Full phone e.g. +639171234567 */
  value: string;
  onChange: (fullPhone: string) => void;
  disabled?: boolean;
}) {
  const [previousValue, setPreviousValue] = useState(value);
  const [phone, setPhone] = useState(() => splitPhone(value));

  if (value !== previousValue) {
    setPreviousValue(value);
    setPhone(splitPhone(value));
  }

  const iso = phone.iso || getDefaultCountryIso();
  const national = phone.national;

  function emit(nextIso: string, nextNational: string) {
    onChange(joinPhone(nextIso, nextNational));
  }

  return (
    <div className="flex gap-2">
      <div className="relative shrink-0">
        <select
          disabled={disabled}
          value={iso}
          onChange={(e) => {
            const nextIso = e.target.value;
            setPhone({ iso: nextIso, national });
            emit(nextIso, national);
          }}
          className="h-full appearance-none rounded-lg border border-white/15 bg-[#0B132B]/60 py-2.5 pl-3 pr-8 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
      </div>

      <input
        type="tel"
        disabled={disabled}
        value={national}
        onChange={(e) => {
          const next = e.target.value;
          setPhone({ iso, national: next });
          emit(iso, next);
        }}
        placeholder="Phone number"
        className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
      />
    </div>
  );
}