"use client";

import type { StatsNode } from "@shared/types/Stats";
import { fmtDuration } from "../utils/format";
import { TargetIcon, ChevronsUpIcon } from "lucide-react";

export type EntityKind = "mode" | "goal" | "project" | "milestone" | "task";

type Props = {
  kind: EntityKind;
  node: StatsNode;
  /** Immediate parent title (or undefined if floating). */
  parentTitle?: string | null;
  modeColor: string;

  /** Optional handler to perform a chain-up action for this node. */
  onChainUp?: (
    kind: EntityKind,
    node: StatsNode,
    parentTitle: string | null
  ) => void;
  /** Whether to show the chain-up affordance at all. */
  canChainUp?: boolean;
};

export function StatsNodeCard({
  kind,
  node,
  parentTitle,
  modeColor,
  onChainUp,
  canChainUp,
}: Props) {
  const showChainUp =
    !!onChainUp && !!canChainUp && !!parentTitle && (node.selfSeconds ?? 0) > 0;

  const seconds = node.selfSeconds ?? 0;
  const hours = seconds / 3600;

  // 1 vertical bar per full hour, plus one proportional bar for the remainder.
  const fullBars = Math.floor(hours);
  const fractional = hours - fullBars;

  const barDefs: { key: string; heightPercent: number }[] = [];

  if (hours > 0) {
    for (let i = 0; i < fullBars; i += 1) {
      barDefs.push({ key: `full-${i}`, heightPercent: 100 });
    }

    if (fractional > 0) {
      barDefs.push({
        key: "partial",
        heightPercent: fractional * 100,
      });
    }

    // < 1h total → one partial bar
    if (barDefs.length === 0) {
      barDefs.push({
        key: "subhour",
        heightPercent: Math.min(hours * 100, 100),
      });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm hover:bg-white">
      {/* LEFT SIDE */}
      <div className="flex min-w-0 items-center gap-2 text-gray-700 leading-tight">
        {renderKindIcon(kind, modeColor)}

        {/* Title + | parent */}
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-baseline truncate">
            <span className="truncate font-medium text-gray-900">
              {node.title || "Untitled"}
            </span>
            {parentTitle && (
              <>
                <span className="mx-1 shrink-0 text-gray-400">|</span>
                <span className="truncate text-gray-500">{parentTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — direct time + hour bars + chain-up */}
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        {/* Duration + chain button in one row */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-900">
            {fmtDuration(seconds)}
          </span>

          {showChainUp && (
            <button
              type="button"
              onClick={() => onChainUp?.(kind, node, parentTitle ?? null)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900"
              title="Chain time up to parent"
            >
              <ChevronsUpIcon className="h-3 w-3" />
              <span>Chain up</span>
            </button>
          )}
        </div>

        {/* Vertical hour bars */}
        {barDefs.length > 0 && (
          <div className="flex max-w-[220px] flex-wrap items-end justify-end gap-[3px]">
            {barDefs.map((bar) => (
              <div
                key={bar.key}
                className="w-1.5 rounded-full bg-gray-100"
                style={{
                  height: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="w-full rounded-full"
                  style={{
                    height: `${bar.heightPercent}%`,
                    marginTop: `${100 - bar.heightPercent}%`,
                    backgroundColor: modeColor,
                    transition:
                      "height 120ms ease-out, margin-top 120ms ease-out",
                  }}
                />
              </div>
            ))}
            <span className="ml-1 whitespace-nowrap text-[10px] text-gray-500">
              {hours.toFixed(1)}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/* Icon renderer – includes 'mode'                    */
/* -------------------------------------------------- */

function renderKindIcon(kind: EntityKind, modeColor: string) {
  switch (kind) {
    case "mode":
      // Mode icon (your square)
      return (
        <div
          className="h-3.5 w-3.5 rounded-sm"
          style={{ backgroundColor: modeColor }}
        />
      );

    case "goal":
      return (
        <div
          className="relative top-[0.5px] left-[0.5px] flex h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: modeColor }}
        >
          <TargetIcon className="h-4 w-4 text-white" />
        </div>
      );

    case "milestone":
      return (
        <span
          className="triangle"
          style={{
            borderTopColor: modeColor,
            borderTopWidth: 10,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            transform: "rotate(0deg)",
          }}
        />
      );

    case "project":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={modeColor}
          className="h-5 w-5"
        >
          <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h5.379a1.5 1.5 0 0 1 1.06.44l1.621 1.62H19.5A1.5 1.5 0 0 1 21 6.56V18a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18V4.5Z" />
        </svg>
      );

    case "task":
    default:
      return (
        <span
          className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: modeColor }}
        />
      );
  }
}
