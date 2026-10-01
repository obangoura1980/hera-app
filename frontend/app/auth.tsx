import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Button, ErrorText } from "@/src/components/ui";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

export default function AuthScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (mode === "register" && !name.trim()) return setErr("Please tell us your name");
    if (!email.trim() || !password) return setErr("Email and password are required");
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="auth-screen">
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1619331603973-492406a358b7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" }}
        style={styles.hero}
        contentFit="cover"
      />
      <LinearGradient colors={[colors.scrimClear, colors.surface]} style={styles.hero} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 120, paddingBottom: insets.bottom + space.xl }]}
      >
        <Text style={styles.brand}>hera</Text>
        <Text style={styles.title}>{mode === "register" ? "Begin your\nmanifestation journal" : "Welcome back,\ndreamer"}</Text>
        <View style={styles.card}>
          {mode === "register" ? (
            <TextInput
              testID="auth-name-input"
              style={styles.input}
              placeholder="Your first name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          ) : null}
          <TextInput
            testID="auth-email-input"
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            testID="auth-password-input"
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onSubmitEditing={submit}
          />
          <ErrorText msg={err} testID="auth-error-text" />
          <Button
            testID="auth-submit-button"
            title={mode === "register" ? "Create account" : "Log in"}
            onPress={submit}
            loading={busy}
            style={{ marginTop: space.lg }}
          />
        </View>
        <Pressable
          testID="auth-toggle-mode-button"
          style={styles.toggle}
          onPress={() => {
            setErr(null);
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          <Text style={styles.toggleText}>
            {mode === "login" ? "New to Hera? " : "Already have an account? "}
            <Text style={styles.toggleLink}>{mode === "login" ? "Create account" : "Log in"}</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 340 },
  scroll: { paddingHorizontal: space.xl },
  brand: { fontFamily: fonts.display, fontWeight: "700", fontSize: 18, color: c.onSurfaceInverse, letterSpacing: 2 },
  title: { fontFamily: fonts.display, fontWeight: "700", fontSize: 32, lineHeight: 38, color: c.onSurface, marginTop: space.xxl },
  card: {
    marginTop: space.xl,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    paddingHorizontal: space.lg,
    fontFamily: fonts.text,
    fontSize: 16,
    color: c.onSurface,
    borderWidth: 1,
    borderColor: c.border,
  },
  toggle: { alignItems: "center", paddingVertical: space.xl, minHeight: 44 },
  toggleText: { fontFamily: fonts.text, fontSize: 15, color: c.muted },
  toggleLink: { color: c.brandPrimary, fontWeight: "700" },
}));
