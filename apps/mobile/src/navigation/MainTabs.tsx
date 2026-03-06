import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useMyInvitations } from "@shared/api/hooks/collaboration/useMyInvitations";
import DashboardScreen from "../screens/DashboardScreen";
import TodayScreen from "../screens/TodayScreen";
import TimerScreen from "../screens/TimerScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Home: "home",
  Today: "sun",
  Timer: "clock",
  Settings: "settings",
};

export default function MainTabs() {
  const { data: invitations = [] } = useMyInvitations();
  const pendingCount = invitations.filter((i) => i.status === "pending").length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <Feather
            name={TAB_ICONS[route.name] ?? "circle"}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#e5e7eb" },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={pendingCount > 0 ? { tabBarBadge: pendingCount } : undefined}
      />
    </Tab.Navigator>
  );
}
