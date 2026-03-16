import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Forces the Android navigation bar to white while a modal is visible.
 * No-op on iOS.
 */
export function useWhiteNavBar(visible: boolean) {
  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    // Set immediately
    NavigationBar.setBackgroundColorAsync("#ffffff");
    NavigationBar.setButtonStyleAsync("dark");
    // Also set after a short delay — Android Modals render in a separate
    // window and the initial call can be ignored.
    const t = setTimeout(() => {
      NavigationBar.setBackgroundColorAsync("#ffffff");
      NavigationBar.setButtonStyleAsync("dark");
    }, 150);
    return () => clearTimeout(t);
  }, [visible]);
}
