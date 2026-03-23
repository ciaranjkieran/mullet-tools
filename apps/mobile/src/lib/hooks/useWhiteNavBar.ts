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

    const set = () => {
      NavigationBar.setBackgroundColorAsync("#ffffff");
      NavigationBar.setButtonStyleAsync("dark");
    };

    // Android Modals render in a separate window — the nav bar color
    // can be overridden at various points during the modal lifecycle.
    // Retry several times to ensure it sticks.
    set();
    const delays = [100, 300, 600];
    const timers = delays.map((ms) => setTimeout(set, ms));

    return () => timers.forEach(clearTimeout);
  }, [visible]);
}
