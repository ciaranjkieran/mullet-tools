import { Platform, type ViewStyle, type TextStyle } from "react-native";

/**
 * Consistent shadow across iOS (shadow* props) and Android (elevation).
 * Level: "sm" (subtle card), "md" (raised card), "lg" (floating element)
 */
export function cardShadow(level: "sm" | "md" | "lg" = "sm"): ViewStyle {
  const presets = {
    sm: { opacity: 0.06, radius: 3, offset: 1, elevation: 1 },
    md: { opacity: 0.1, radius: 6, offset: 2, elevation: 3 },
    lg: { opacity: 0.15, radius: 10, offset: 4, elevation: 8 },
  };
  const p = presets[level];
  return {
    shadowColor: "#000",
    shadowOpacity: p.opacity,
    shadowRadius: p.radius,
    shadowOffset: { width: 0, height: p.offset },
    elevation: p.elevation,
  };
}

/**
 * Mode-colored shadow for selected entity cards.
 */
export function selectedShadow(modeColor: string): ViewStyle {
  return {
    shadowColor: modeColor,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  };
}

/**
 * Standard card container style — ensures border radius clips properly on Android.
 */
export function cardBase(borderRadius = 8): ViewStyle {
  return {
    borderRadius,
    overflow: "hidden" as const,
    ...cardShadow("sm"),
  };
}

/**
 * Explicit lineHeight for cross-platform text consistency.
 * Android Roboto and iOS San Francisco have different default metrics.
 */
export function textLine(fontSize: number, multiplier = 1.35): TextStyle {
  return { fontSize, lineHeight: Math.round(fontSize * multiplier) };
}

/**
 * Platform-specific value helper.
 */
export function ios<T>(iosVal: T, androidVal: T): T {
  return Platform.OS === "ios" ? iosVal : androidVal;
}
