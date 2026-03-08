import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getContrastingText } from "@shared/utils/getContrastingText";
import type { ActiveTimerDTO, Kind } from "@shared/types/Timer";

type Props = {
  active: ActiveTimerDTO | null;
  clockType: Kind;
  nowMs: number;
  durationSec: number;
  modeColor: string;
  onStart: () => void;
  onStop: () => void;
  onComplete?: () => void;
  starting: boolean;
  stopping: boolean;
  completing?: boolean;
  /** True when active session is timing an entity (not just a mode) */
  hasEntity?: boolean;
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(rem)}`;
  return `${pad2(m)}:${pad2(rem)}`;
}

export default function TimerClock({
  active,
  clockType,
  nowMs,
  durationSec,
  modeColor,
  onStart,
  onStop,
  onComplete,
  starting,
  stopping,
  completing = false,
  hasEntity = false,
}: Props) {
  let displaySec = 0;
  let running = false;

  if (active) {
    running = true;
    if (active.kind === "stopwatch") {
      const startedAtMs = Date.parse(active.startedAt);
      displaySec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
    } else {
      // Countdown
      if (active.endsAt) {
        const endsAtMs = Date.parse(active.endsAt);
        displaySec = Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
      } else {
        const startedAtMs = Date.parse(active.startedAt);
        const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
        const planned =
          typeof active.plannedSeconds === "number"
            ? active.plannedSeconds
            : durationSec;
        displaySec = Math.max(0, Math.ceil(planned - elapsed));
      }
    }
  } else {
    displaySec = clockType === "stopwatch" ? 0 : Math.max(0, durationSec);
  }

  const label = running
    ? active?.kind === "stopwatch"
      ? "elapsed"
      : "remaining"
    : clockType === "stopwatch"
      ? "ready"
      : durationSec > 0
        ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
        : "set duration";

  const textColor = getContrastingText(modeColor);
  const busy = starting || stopping || completing;
  const canStart = clockType === "stopwatch" || durationSec > 0;

  const showComplete = running && hasEntity && !!onComplete;

  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: modeColor,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: 56,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
          color: "#111",
        }}
      >
        {formatTime(displaySec)}
      </Text>
      <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
        {label}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 20, gap: 12 }}>
        {running ? (
          <>
            <TouchableOpacity
              onPress={onStop}
              disabled={busy}
              style={{
                backgroundColor: "#991B1B",
                paddingVertical: 12,
                paddingHorizontal: 32,
                borderRadius: 10,
                opacity: busy ? 0.5 : 1,
              }}
            >
              {stopping ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}
                >
                  Stop
                </Text>
              )}
            </TouchableOpacity>

            {showComplete && (
              <TouchableOpacity
                onPress={onComplete}
                disabled={busy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#14532D",
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  gap: 6,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {completing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      Complete
                    </Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            onPress={onStart}
            disabled={busy || !canStart}
            style={{
              backgroundColor: modeColor,
              paddingVertical: 12,
              paddingHorizontal: 32,
              borderRadius: 10,
              opacity: busy || !canStart ? 0.5 : 1,
            }}
          >
            {starting ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <Text
                style={{ color: textColor, fontWeight: "600", fontSize: 16 }}
              >
                Start
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
