"use client";

import Image from "next/image";

type Props = {
  url: string;
  name: string;
  mime?: string;
};

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default function CommentAttachment({ url, name, mime = "" }: Props) {
  if (!isSafeUrl(url)) {
    return <span className="text-sm text-gray-400">Invalid attachment URL</span>;
  }

  const isImage =
    mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url);
  const isVideo = mime.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(url);
  const isAudio =
    mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(url);
  const isPDF = mime === "application/pdf" || /\.pdf$/i.test(url);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <Image
          src={url}
          alt={name}
          width={800}
          height={600}
          className="max-h-64 w-auto rounded border border-gray-200 object-contain"
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video
        src={url}
        controls
        className="w-full max-h-72 rounded border border-gray-200"
      />
    );
  }

  if (isAudio) {
    return (
      <div className="rounded border border-gray-200 p-2">
        <div className="text-xs mb-1">{name}</div>
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  if (isPDF) {
    return (
      <div className="rounded border border-gray-200">
        <iframe src={url} className="w-full h-96 rounded" sandbox="allow-same-origin" />
        <div className="px-2 py-1 text-xs">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Open {name}
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline break-all"
    >
      📎 {name}
    </a>
  );
}
