import { useState, useCallback, useRef } from "react";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import type { AiBuildRequest, AiBuildResponse } from "../../../types/AiBuilder";

export function useAiBuild() {
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const build = useCallback(
    async (
      payload: AiBuildRequest,
      onSuccess: (data: AiBuildResponse) => void
    ) => {
      setIsPending(true);
      setIsError(false);
      setStreamingText("");

      abortRef.current = new AbortController();

      try {
        const csrfToken = await ensureCsrf();
        const baseURL = api.defaults.baseURL;

        const response = await fetch(`${baseURL}/ai/build/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          credentials: "include",
          body: JSON.stringify(payload),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const data = JSON.parse(part.slice(6));

            if (data.type === "delta") {
              fullText += data.text;
              setStreamingText(fullText);
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
        }

        // Extract JSON from accumulated text
        let jsonText = fullText.trim();
        const match = jsonText.match(/[\[{]/);
        if (match && match.index !== undefined) {
          jsonText = jsonText.slice(match.index);
        }
        jsonText = jsonText.replace(/```\s*$/, "").trimEnd();

        const result: AiBuildResponse = JSON.parse(jsonText);
        onSuccess(result);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setIsError(true);
        }
      } finally {
        setIsPending(false);
        abortRef.current = null;
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { build, streamingText, isPending, isError, abort };
}
