// components/windows/shared/EntityWindowShell.tsx
"use client";

import {
  Children,
  ReactElement,
  ReactNode,
  isValidElement,
  useState,
} from "react";
import clsx from "clsx";
import React from "react";

type TabProps = {
  name: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

type ShellProps = {
  modeColor: string;
  children: ReactNode; // <Tab/> elements
  activeIndex?: number;
  onTabChange?: (index: number) => void;

  /** content rendered below the vertical tab buttons in the right rail */
  railFooter?: ReactNode;
};

export default function EntityWindowShell({
  modeColor,
  children,
  activeIndex: controlledIndex,
  onTabChange,
  railFooter,
}: ShellProps) {
  const tabs = Children.toArray(children).filter(
    isValidElement
  ) as ReactElement<TabProps>[];

  const [uncontrolledIndex, setUncontrolledIndex] = useState(0);
  const activeIndex = controlledIndex ?? uncontrolledIndex;
  const setActiveIndex = onTabChange ?? setUncontrolledIndex;

  return (
    <div className="flex w-full h-full bg-background rounded-lg border border-border shadow-xl overflow-hidden relative">
      {/* Top border */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-full h-1.5 md:h-4 z-10"
        style={{ backgroundColor: modeColor }}
      />
      {/* Left stripe */}
      <div
        className="absolute top-0 left-0 h-full w-4 md:w-3 rounded-l-xl"
        style={{ backgroundColor: modeColor, opacity: 0.5 }}
      />

      {/* Main content (tab decides scroll layout) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {tabs[activeIndex]}
      </div>

      {/* Right rail */}
      <aside className="flex flex-col justify-start items-center relative pl-3 pr-2 py-4 bg-background">
        {/* Mode accent line */}
        <div
          className="absolute top-0 bottom-0 left-0 w-1.5"
          style={{ backgroundColor: modeColor }}
        />

        {/* Tab buttons */}
        <div className="flex flex-col pr-3 pl-3 pt-4 space-y-3 z-10">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;

            return (
              <div
                key={i}
                className="relative inline-flex items-center justify-center group"
              >
                {/* Hover tooltip */}
                <span
                  className="
                    tip-bubble
                    absolute right-full mr-3 top-1/2 -translate-y-1/2
                    opacity-0 group-hover:opacity-100
                  "
                >
                  {tab.props.name}
                </span>

                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-pressed={isActive}
                  aria-label={tab.props.name}
                  className={clsx(
                    "w-10 h-10 rounded-md flex items-center justify-center border-2 transition-all duration-150",
                    isActive ? "text-white" : "bg-transparent hover:bg-muted/10"
                  )}
                  style={{
                    backgroundColor: isActive ? modeColor : "transparent",
                    opacity: 0.75,
                    borderColor: modeColor,
                    color: isActive ? "white" : modeColor,
                  }}
                >
                  {isValidElement(tab.props.icon)
                    ? React.cloneElement(
                        tab.props.icon as React.ReactElement<any>,
                        {
                          className: "w-5 h-5",
                        }
                      )
                    : tab.props.name.charAt(0)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer area: aligned in the same column, spaced below with a subtle divider */}
        {railFooter && (
          <div className="flex flex-col items-center w-full z-10">
            <div
              className="w-8 mt-6 mb-3 border-t"
              style={{ borderColor: `${modeColor}33` }}
            />
            <div className="pl-3 pr-3">{railFooter}</div>
          </div>
        )}
      </aside>
    </div>
  );
}

EntityWindowShell.Tab = Tab;
