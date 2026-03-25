import { useState, useCallback, useRef } from "react";
import api, { getAuthMode, getTokenHeader } from "../../axios";
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
        const baseURL = api.defaults.baseURL;
        const isToken = getAuthMode() === "token";

        let authHeaders: Record<string, string> = {};
        if (isToken) {
          authHeaders = await getTokenHeader();
        } else {
          await ensureCsrf();
          // ensureCsrf() caches the token on the axios instance;
          // read it back so native fetch() can send it too.
          const csrfToken =
            (api.defaults.headers.common["X-CSRFToken"] as string) ?? "";
          if (csrfToken) authHeaders["X-CSRFToken"] = csrfToken;
        }

        const response = await fetch(`${baseURL}/ai/build/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          ...(isToken ? {} : { credentials: "include" as const }),
          body: JSON.stringify(payload),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        let fullText = "";

        if (response.body && typeof response.body.getReader === "function") {
          // Browser: stream via ReadableStream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
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
        } else {
          // React Native: no ReadableStream, read full response
          const raw = await response.text();
          const parts = raw.split("\n\n");

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const data = JSON.parse(part.slice(6));

            if (data.type === "delta") {
              fullText += data.text;
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
          setStreamingText(fullText);
        }

        // Extract JSON from accumulated text
        let jsonText = fullText.trim();
        const match = jsonText.match(/[\[{]/);
        if (match && match.index !== undefined) {
          jsonText = jsonText.slice(match.index);
        }
        jsonText = jsonText.replace(/```\s*$/, "").trimEnd();

        let result: AiBuildResponse;
        try {
          result = JSON.parse(jsonText);
        } catch {
          throw new Error(
            "The AI response was too large or incomplete. Try a shorter prompt."
          );
        }
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
