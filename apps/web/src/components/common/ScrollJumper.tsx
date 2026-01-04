// ScrollJumper.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { getContrastingText } from "@shared/utils/getContrastingText";

type CustomPos = { top: number; left: number };

type Props = {
  /** If provided, watches this scrollable element instead of window */
  containerRef?: React.RefObject<HTMLElement>;
  /** Show a "jump to latest" button when bottom isn't visible */
  enableBottom?: boolean;
  /** Show after N viewport heights (or container heights) */
  showAfterVH?: number;
  /** Corner placement when not using customPosition */
  position?: "left" | "right";
  /** Circle or pill */
  variant?: "circle" | "pill";
  /** Circle size in px */
  diameter?: number;
  /** Offsets for corner placement (ignored when using customPosition) */
  offset?: { bottom?: number; left?: number; right?: number };
  /** Background color (mode color) */
  modeColor?: string;
  /** Labels for a11y/tooltips (only used for titles/aria) */
  labelTop?: string;
  labelBottom?: string;
  /** Absolute fixed placement; overrides position/offset when provided */
  customPosition?: CustomPos;

  /** Keep top button visible while scrolling upward (until near top) */
  persistWhileScrollingUp?: boolean;
  /** Hysteresis for show/hide thresholds, in viewport heights */
  hysteresisVH?: number;
};

export default function ScrollJumper({
  containerRef,
  enableBottom = false,
  showAfterVH = 1,
  position = "left",
  variant = "circle",
  diameter = 48,
  offset = { bottom: 24, left: 24, right: 24 },
  modeColor = "#e5e7eb", // fallback gray-200
  labelTop = "Top",
  labelBottom = "Latest",
  customPosition,

  persistWhileScrollingUp = true,
  hysteresisVH = 0.25,
}: Props) {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  const topSentinel = useRef<HTMLDivElement | null>(null);
  const bottomSentinel = useRef<HTMLDivElement | null>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    []
  );

  const textColor = getContrastingText(modeColor);

  const scrollToPos = (pos: "top" | "bottom") => {
    const el = containerRef?.current;
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    if (el) {
      el.scrollTo({ top: pos === "top" ? 0 : el.scrollHeight, behavior });
    } else {
      const target =
        pos === "top"
          ? 0
          : Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
      // Faster scroll — ~200ms duration
      const start = window.scrollY;
      const change = target - start;
      const duration = 200; // ms
      const startTime = performance.now();

      function animateScroll(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        window.scrollTo(0, start + change * eased);
        if (progress < 1) requestAnimationFrame(animateScroll);
      }

      requestAnimationFrame(animateScroll);
    }
  };

  // Internal visibility state mirrors (avoid stale closures in RAF/handlers)
  const lastScrollYRef = useRef<number>(0);
  const showTopRef = useRef<boolean>(false);
  const showBottomRef = useRef<boolean>(false);

  useEffect(() => {
    const root = containerRef?.current ?? null;

    const decideVisibility = (st: number, clientH: number, sh: number) => {
      const showAfterPx = clientH * showAfterVH;
      const hideAfterPx = Math.max(0, showAfterPx - clientH * hysteresisVH);

      const directionUp = st < lastScrollYRef.current;
      lastScrollYRef.current = st;

      // --- TOP BUTTON ---
      let nextShowTop = showTopRef.current;
      if (!nextShowTop) {
        // hidden -> use 'show' threshold
        nextShowTop = st > showAfterPx;
      } else {
        // shown -> use 'hide' threshold (lower) unless persisting while scrolling up
        const nearTop = st <= 4; // small epsilon
        if (persistWhileScrollingUp && directionUp && !nearTop) {
          nextShowTop = true;
        } else {
          nextShowTop = !(st < hideAfterPx || nearTop);
        }
      }

      // --- BOTTOM BUTTON ---
      // Show when not within last ~20% of scroll height (mild hysteresis)
      const wantShowBottom = enableBottom && st + clientH < sh - clientH * 0.2;
      let nextShowBottom = showBottomRef.current;
      if (!nextShowBottom) {
        nextShowBottom = wantShowBottom;
      } else {
        const hideBottomNow =
          !enableBottom || st + clientH > sh - clientH * 0.15;
        nextShowBottom = !hideBottomNow;
      }

      if (nextShowTop !== showTopRef.current) {
        showTopRef.current = nextShowTop;
        setShowTop(nextShowTop);
      }
      if (nextShowBottom !== showBottomRef.current) {
        showBottomRef.current = nextShowBottom;
        setShowBottom(nextShowBottom);
      }
    };

    // ---------- CONTAINER MODE ----------
    if (root) {
      // Optional sentinels (kept for compatibility, but main logic uses scroll)
      const observer = new IntersectionObserver(
        (entries) => {
          const t = entries.find((e) => e.target === topSentinel.current);
          const b = entries.find((e) => e.target === bottomSentinel.current);
          if (t) setShowTop((prev) => (showTopRef.current = !t.isIntersecting));
          if (enableBottom && b)
            setShowBottom(
              (prev) => (showBottomRef.current = !b.isIntersecting)
            );
        },
        { root, threshold: 0.01 }
      );
      if (topSentinel.current) observer.observe(topSentinel.current);
      if (enableBottom && bottomSentinel.current)
        observer.observe(bottomSentinel.current);

      const scroller = root;

      const onScroll = () => {
        const st = scroller.scrollTop;
        const clientH = scroller.clientHeight;
        const sh = scroller.scrollHeight;
        decideVisibility(st, clientH, sh);
      };

      const onResize = () => onScroll();

      // init
      lastScrollYRef.current = scroller.scrollTop;
      onScroll();

      scroller.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });

      return () => {
        observer.disconnect();
        scroller.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }

    // ---------- WINDOW MODE ----------
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const st = window.scrollY || doc.scrollTop || 0;
        const clientH = doc.clientHeight;
        const sh = Math.max(doc.scrollHeight, document.body.scrollHeight);
        decideVisibility(st, clientH, sh);
      });
    };
    const onResize = onScroll;

    // init
    lastScrollYRef.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [
    containerRef,
    enableBottom,
    showAfterVH,
    persistWhileScrollingUp,
    hysteresisVH,
  ]);

  // Positioning
  const cornerPos =
    position === "left"
      ? { left: `calc(${offset.left ?? 24}px + env(safe-area-inset-left))` }
      : { right: `calc(${offset.right ?? 24}px + env(safe-area-inset-right))` };

  const stackStyle: React.CSSProperties = customPosition
    ? {
        position: "fixed",
        top: customPosition.top,
        left: customPosition.left,
        zIndex: 60,
        transform: "translate(-50%, -50%)", // center on that point
      }
    : {
        position: "fixed",
        bottom: `calc(${offset.bottom ?? 24}px + env(safe-area-inset-bottom))`,
        zIndex: 60,
        ...cornerPos,
      };

  const isCircle = variant === "circle";
  const baseBtn =
    "shadow-md border border-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 transition cursor-pointer";

  const circleStyle: React.CSSProperties = {
    width: diameter,
    height: diameter,
    backgroundColor: modeColor,
    color: textColor,
  };

  const pillStyle: React.CSSProperties = {
    backgroundColor: modeColor,
    color: textColor,
    padding: "0.5rem 0.75rem",
    fontSize: 14,
  };

  const btnClass = isCircle
    ? `grid place-items-center rounded-full ${baseBtn}`
    : `rounded-full ${baseBtn}`;

  return (
    <>
      {/* Sentinels only used in container mode (optional) */}
      {containerRef && (
        <>
          <div ref={topSentinel} />
          <div ref={bottomSentinel} />
        </>
      )}

      <div
        style={stackStyle}
        className="flex flex-col gap-10 pointer-events-auto"
      >
        {enableBottom && showBottom && (
          <button
            onClick={() => scrollToPos("bottom")}
            aria-label={labelBottom}
            className={btnClass}
            style={isCircle ? circleStyle : pillStyle}
            title={labelBottom}
          >
            {isCircle ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              `↓ ${labelBottom}`
            )}
          </button>
        )}
        {showTop && (
          <button
            onClick={() => scrollToPos("top")}
            aria-label={labelTop}
            className={btnClass}
            style={isCircle ? circleStyle : pillStyle}
            title={labelTop}
          >
            {isCircle ? <ChevronUp className="w-5 h-5" /> : `↑ ${labelTop}`}
          </button>
        )}
      </div>
    </>
  );
}
