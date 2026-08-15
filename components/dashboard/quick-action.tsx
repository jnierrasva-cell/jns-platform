import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function QuickAction({
  label,
  description,
  icon: Icon,
  onClick,
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-[#2c3140] bg-[#1b1f29] p-4 text-left hover:border-[#3a4155] hover:-translate-y-0.5 transition-all"
    >
      <div className="rounded-lg bg-[#232838] p-2 text-[#d9a253]">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#edeae3]">{label}</p>
        <p className="text-xs text-[#a8a6a0] mt-0.5">{description}</p>
      </div>
    </button>
  );
}