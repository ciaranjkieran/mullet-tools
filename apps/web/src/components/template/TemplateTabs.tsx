"use client";

type Props = {
  selected: "milestone" | "project";
  onSelect: (type: "milestone" | "project") => void;
  modeColor?: string;
};

export default function TemplateTabs({ selected, onSelect, modeColor }: Props) {
  const tabs: { label: string; value: "milestone" | "project" }[] = [
    { label: "Milestones", value: "milestone" },
    { label: "Projects", value: "project" },
  ];

  return (
    <div className="flex rounded-lg bg-muted/40 p-1 gap-1">
      {tabs.map((tab) => {
        const isActive = selected === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
              isActive
                ? "text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            style={isActive && modeColor ? { backgroundColor: modeColor } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
