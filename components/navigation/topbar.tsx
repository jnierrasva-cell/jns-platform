"use client";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-[#2c3140] bg-[#10131a]/90 backdrop-blur px-6 py-5">
      <div>
        <h1 className="text-lg font-semibold text-[#edeae3] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#a8a6a0] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[#1b1f29] border border-[#2c3140] flex items-center justify-center text-xs text-[#a8a6a0] font-mono">
          CL
        </div>
      </div>
    </header>
  );
}