import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "mullet_onboarding_complete";

const { width } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  color: string;
};

const SLIDES: Slide[] = [
  {
    icon: "layers",
    title: "Organize Everything",
    subtitle:
      "Create Modes for different areas of your life, then add Goals, Projects, Milestones, and Tasks inside them.",
    color: "#2563eb",
  },
  {
    icon: "clock",
    title: "Track Your Time",
    subtitle:
      "Start timers on any task to see where your time goes. Review stats and insights to stay productive.",
    color: "#7c3aed",
  },
  {
    icon: "users",
    title: "Collaborate",
    subtitle:
      "Invite others to your Modes. Assign tasks, share progress, and build together.",
    color: "#059669",
  },
  {
    icon: "zap",
    title: "AI-Powered Planning",
    subtitle:
      "Describe what you want to build and let AI generate your entire entity hierarchy in seconds.",
    color: "#ea580c",
  },
];

type Props = {
  onComplete: () => void;
};

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return value === "true";
}

export async function markOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      markOnboardingComplete().then(onComplete);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete().then(onComplete);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View
              style={[styles.iconContainer, { backgroundColor: item.color + "15" }]}
            >
              <Feather name={item.icon} size={48} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? SLIDES[activeIndex].color : "#d1d5db",
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={[
            styles.nextButton,
            { backgroundColor: SLIDES[activeIndex].color },
          ]}
        >
          <Text style={styles.nextButtonText}>
            {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Feather
            name={
              activeIndex === SLIDES.length - 1 ? "check" : "arrow-right"
            }
            size={18}
            color="#fff"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 15,
    color: "#9ca3af",
    fontWeight: "500",
  },
  slide: {
    width,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    flex: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
