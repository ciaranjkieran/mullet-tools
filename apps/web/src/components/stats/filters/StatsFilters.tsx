import { Mode } from "@shared/types/Mode";

type Range = { from: string; to: string };

type Props = {
  range: Range;
  onRangeChange: (r: Range) => void;
  modeId: number | null;
  onModeChange: (id: number | null) => void;
  modes: Mode[];
};

export default function StatsFilters({
  range,
  onRangeChange,
  modeId,
  onModeChange,
  modes,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <div className="mb-1 font-medium">From</div>
        <input
          type="date"
          value={range.from}
          onChange={(e) => onRangeChange({ ...range, from: e.target.value })}
          className="border rounded px-2 py-1"
        />
      </label>

      <label className="text-sm">
        <div className="mb-1 font-medium">To</div>
        <input
          type="date"
          value={range.to}
          onChange={(e) => onRangeChange({ ...range, to: e.target.value })}
          className="border rounded px-2 py-1"
        />
      </label>

      <label className="text-sm">
        <div className="mb-1 font-medium">Mode</div>
        <select
          value={modeId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onModeChange(v === "" ? null : Number(v));
          }}
          className="border rounded px-2 py-1 min-w-[10rem]"
        >
          <option value="">All</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
