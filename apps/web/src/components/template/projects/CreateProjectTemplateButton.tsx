"use client";

type Props = {
  onClick: () => void;
  modeColor: string;
};

export default function CreateProjectTemplateButton({
  onClick,
  modeColor,
}: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-md border text-lg font-medium flex items-center justify-center gap-2 transition hover:shadow"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={modeColor}
        className="w-6 h-6"
      >
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
      </svg>
      Create Project Template
    </button>
  );
}
