import React from "react";
import { Text, type TextStyle } from "react-native";

type Segment = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

/**
 * Parses basic HTML (b/strong, i/em, u) into styled Text segments.
 * Handles nested tags and strips all other HTML.
 */
function parseHtml(html: string): Segment[] {
  const segments: Segment[] = [];
  let bold = false;
  let italic = false;
  let underline = false;

  // Replace <br>, <br/>, <p>...</p> with newlines
  let cleaned = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  const tagPattern = /<\/?(?:b|strong|i|em|u)(?:\s[^>]*)?>|[^<]+|<[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(cleaned)) !== null) {
    const token = match[0];

    if (token.startsWith("<")) {
      const lower = token.toLowerCase();
      if (lower === "<b>" || lower === "<strong>") bold = true;
      else if (lower === "</b>" || lower === "</strong>") bold = false;
      else if (lower === "<i>" || lower === "<em>") italic = true;
      else if (lower === "</i>" || lower === "</em>") italic = false;
      else if (lower === "<u>") underline = true;
      else if (lower === "</u>") underline = false;
      // Skip all other tags
    } else {
      if (token) {
        segments.push({ text: token, bold, italic, underline });
      }
    }
  }

  return segments;
}

type Props = {
  html: string;
  style?: TextStyle;
};

export default function RichNoteBody({ html, style }: Props) {
  const segments = parseHtml(html);

  if (segments.length === 0) {
    return (
      <Text style={[{ fontSize: 14, color: "#1f2937", lineHeight: 20 }, style]}>
        (empty note)
      </Text>
    );
  }

  return (
    <Text style={[{ fontSize: 14, color: "#1f2937", lineHeight: 20 }, style]}>
      {segments.map((seg, i) => {
        const segStyle: TextStyle = {};
        if (seg.bold) segStyle.fontWeight = "700";
        if (seg.italic) segStyle.fontStyle = "italic";
        if (seg.underline) segStyle.textDecorationLine = "underline";

        return Object.keys(segStyle).length > 0 ? (
          <Text key={i} style={segStyle}>
            {seg.text}
          </Text>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        );
      })}
    </Text>
  );
}
