type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  modeColor: string;
};

export default function TimerNumberField({
  label,
  value,
  onChange,
  modeColor,
}: Props) {
  return (
    <label className="text-sm block">
      <div className="mb-1 font-medium">{label}</div>
      <input
        type="number"
        min={0}
        placeholder="Minutes"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === "" ? 0 : Number(val));
        }}
        className="rounded-md border-2 px-3 py-2 w-28 text-sm"
        style={{ borderColor: modeColor }}
      />
    </label>
  );
}
