export function SetupProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const percent = Math.round((done / Math.max(total, 1)) * 100);
  const circumference = 2 * Math.PI * 20;

  return (
    <div
      role="progressbar"
      aria-label="First-run setup progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${done} of ${total} setup steps complete`}
      className="relative h-[4.5rem] w-[4.5rem] shrink-0"
    >
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-white/15"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
          className="text-accent-cyan transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
        {done}/{total}
      </span>
    </div>
  );
}
