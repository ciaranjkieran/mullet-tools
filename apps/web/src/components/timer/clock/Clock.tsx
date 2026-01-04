// components/timer/Clock.tsx
type ClockProps = { ms: number; className?: string };

export default function Clock({ ms, className }: ClockProps) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <div className={className}>
      <span className="tabular-nums text-4xl font-semibold">{pad(mm)}</span>
      <span className="tabular-nums text-4xl font-semibold">:</span>
      <span className="tabular-nums text-4xl font-semibold">{pad(ss)}</span>
    </div>
  );
}
