import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import MainTabs from "./MainTabs";
import LoginScreen from "../screens/LoginScreen";
import InvitationsScreen from "../screens/InvitationsScreen";
import SearchScreen from "../screens/SearchScreen";
import TemplatesScreen from "../screens/TemplatesScreen";
import PaywallOverlay from "../components/billing/PaywallOverlay";
import OnboardingScreen, {
  hasCompletedOnboarding,
} from "../components/onboarding/OnboardingScreen";
import { useAuthStore } from "../lib/store/useAuthStore";
import { getToken } from "../lib/auth/tokenStorage";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setLoading = useAuthStore((s) => s.setLoading);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check for existing token on boot
  useEffect(() => {
    (async () => {
      const token = await getToken();
      setAuthenticated(!!token);

      // Check onboarding status
      const done = await hasCompletedOnboarding();
      setShowOnboarding(!done);
      setOnboardingChecked(true);

      setLoading(false);
    })();
  }, [setAuthenticated, setLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show onboarding for first-time users (even before login)
  if (onboardingChecked && showOnboarding) {
    return (
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Invitations" component={InvitationsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Templates" component={TemplatesScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>

      {/* Paywall overlay blocks the app when subscription expires */}
      {isAuthenticated && <PaywallOverlay />}
    </NavigationContainer>
  );
}
