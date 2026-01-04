"use client";

type Props = {
  selected: "milestone" | "project";
  onSelect: (type: "milestone" | "project") => void;
};

export default function TemplateTabs({ selected, onSelect }: Props) {
  const tabs: { label: string; value: "milestone" | "project" }[] = [
    { label: "Milestones", value: "milestone" },
    { label: "Projects", value: "project" },
  ];

  return (
    <div className="flex border border-muted rounded-lg overflow-hidden">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          className={`px-4 py-2 text-sm font-medium transition ${
            selected === tab.value
              ? "bg-primary text-white"
              : "bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
