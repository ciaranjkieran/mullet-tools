// components/comments/CommentAttachment.tsx
"use client";

type Props = {
  url: string;
  name: string;
  mime?: string;
};

export default function CommentAttachment({ url, name, mime = "" }: Props) {
  const isImage =
    mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url);
  const isVideo = mime.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(url);
  const isAudio =
    mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(url);
  const isPDF = mime === "application/pdf" || /\.pdf$/i.test(url);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={name}
          className="max-h-64 w-auto rounded border border-gray-200"
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
        <iframe src={url} className="w-full h-96 rounded" />
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
