import TimerNumberField from "./TimerNumberField";

type Props = {
  cdMin: number;
  cdSec: number;
  setCdMin: (v: number) => void;
  setCdSec: (v: number) => void;
  modeColor: string;
};

export default function CountdownSettingsCard({
  cdMin,
  cdSec,
  setCdMin,
  setCdSec,
  modeColor,
}: Props) {
  return (
    <div
      className="rounded-2xl border-2 p-6 space-y-5"
      style={{ borderColor: modeColor }}
    >
      <h3 className="text-lg font-semibold">Countdown settings</h3>
      <div className="flex gap-2">
        {[15, 25, 50].map((m) => (
          <button
            key={m}
            onClick={() => {
              setCdMin(m);
              setCdSec(0);
            }}
            className="px-3 py-1.5 rounded-full border text-sm"
            style={{ borderColor: modeColor }}
          >
            {m} minutes
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <TimerNumberField
          label="Minutes"
          value={cdMin}
          onChange={setCdMin}
          modeColor={modeColor}
        />
        <TimerNumberField
          label="Seconds"
          value={cdSec}
          onChange={setCdSec}
          modeColor={modeColor}
        />
      </div>
    </div>
  );
}
