"use client";

export default function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            "w-2.5 h-2.5 rounded-full transition-colors",
            i + 1 <= current ? "bg-gray-900" : "bg-gray-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
