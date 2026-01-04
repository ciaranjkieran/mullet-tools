"use client";

import TextareaAutosize from "react-textarea-autosize";
import { useEffect, useRef } from "react";

type Props = {
  title: string;
  setTitle: (val: string) => void;
  label?: string; // optional label prop
};

export default function TitleInput({ title, setTitle, label = "Task" }: Props) {
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) titleRef.current.blur(); // prevent highlight on open
  }, []);

  return (
    <div>
      <TextareaAutosize
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`${label} title`}
        minRows={1}
        maxRows={4}
        autoFocus={false}
        className="w-full text-2xl font-bold px-2 py-1.5 border-none rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-800 resize-none leading-snug"
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
        }}
      />
    </div>
  );
}
