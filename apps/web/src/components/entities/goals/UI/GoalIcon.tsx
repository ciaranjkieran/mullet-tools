// src/components/ui/Icon.tsx
import { forwardRef } from "react";

type Props = {
  children: React.ReactNode;
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
};

export default forwardRef<SVGSVGElement, Props>(function Icon(
  { children, size = 20, className, strokeWidth = 1.75, title },
  ref
) {
  const px = Math.round(size);
  return (
    <svg
      ref={ref}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      shapeRendering="geometricPrecision"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {children}
    </svg>
  );
});
