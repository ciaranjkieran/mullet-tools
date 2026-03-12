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
    NavigationBar.setBackgroundColorAsync("#ffffff");
    NavigationBar.setButtonStyleAsync("dark");
  }, [visible]);
}
