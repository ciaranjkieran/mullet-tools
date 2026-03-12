import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLogin } from "@shared/api/hooks/auth/useLogin";
import { useRegister } from "@shared/api/hooks/auth/useRegister";
import { useAuthStore } from "../lib/store/useAuthStore";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const login = useLogin();
  const register = useRegister();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const busy = login.isPending || register.isPending;

  const error = useMemo(() => {
    const e: any = login.isError
      ? login.error
      : register.isError
        ? register.error
        : null;
    if (!e) return null;
    return e?.response?.data?.detail ?? "Something went wrong";
  }, [login.isError, login.error, register.isError, register.error]);

  async function onSubmit() {
    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password });
      } else {
        await register.mutateAsync({ email, password });
      }
      setAuthenticated(true);
    } catch {
      // error shown via `error` memo
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#fff",
      }}
    >
      <Image
        source={require("../../assets/logo.png")}
        style={{ width: 160, height: 160, alignSelf: "center", marginBottom: 8 }}
        resizeMode="contain"
      />
      <Text
        style={{ fontSize: 32, fontWeight: "bold", textAlign: "center" }}
      >
        Mullet
      </Text>
      <Text
        style={{ textAlign: "center", color: "#666", marginTop: 4 }}
      >
        Your productivity, with a fresh cut.
      </Text>

      {/* Toggle login / signup */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 32,
          backgroundColor: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => setMode("login")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: mode === "login" ? "#fff" : "transparent",
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "600" }}>
            Log in
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("signup")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: mode === "signup" ? "#fff" : "transparent",
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "600" }}>
            Sign up
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 10,
          padding: 14,
          marginTop: 20,
          fontSize: 16,
        }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 10,
          padding: 14,
          marginTop: 12,
          fontSize: 16,
          color: "#000",
        }}
      />

      {error && (
        <Text style={{ color: "red", marginTop: 8, textAlign: "center" }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        onPress={onSubmit}
        disabled={busy || !email.trim() || !password.trim()}
        style={{
          marginTop: 16,
          paddingVertical: 14,
          borderRadius: 10,
          backgroundColor: mode === "login" ? "#1d4ed8" : "#7c3aed",
          opacity: busy || !email.trim() || !password.trim() ? 0.5 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            {mode === "login" ? "Log in" : "Sign up"}
          </Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
