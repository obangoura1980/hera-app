import Feather from "@react-native-vector-icons/feather";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, uploadImage } from "@/src/api";
import { Button, Chip, ErrorText, IconButton, tap } from "@/src/components/ui";
import { fonts, makeStyles, radius, space, useTheme } from "@/src/theme";

const CATS = ["Travel", "Health", "Career", "Love", "Home", "Abundance", "Life"];
const PRESETS = [
  "https://images.unsplash.com/photo-1609971757431-439cf7b4141b?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  "https://images.unsplash.com/photo-1549399905-5d1bad747576?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  "https://images.unsplash.com/photo-1522075782449-e45a34f1ddfb?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
  "https://images.unsplash.com/photo-1733935156769-fe0c2a600d6c?crop=entropy&cs=srgb&fm=jpg&q=80&w=800",
];

type Picked = { uri: string; name: string; type: string };

export default function GoalNew() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("Travel");
  const [preset, setPreset] = useState<string | null>(PRESETS[0]);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = async () => {
    setErr(null);
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) return setBlocked(true);
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setBlocked(!perm.canAskAgain);
        return setErr("Photo access lets you pin your own pictures. You can still choose an image below.");
      }
    }
    setBlocked(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true, aspect: [4, 5] });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const type = a.mimeType ?? "image/jpeg";
    setPicked({ uri: a.uri, name: a.fileName ?? `vision.${type.split("/")[1] ?? "jpg"}`, type });
    setPreset(null);
  };

  const save = async () => {
    if (!title.trim()) return setErr("Name the dream you're manifesting");
    setBusy(true);
    setErr(null);
    try {
      const image_path = picked ? await uploadImage(picked.uri, picked.name, picked.type) : null;
      await api("/goals", { method: "POST", body: { title: title.trim(), category: cat, image_path, image_url: picked ? null : preset } });
      tap("success");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      router.back();
    } catch (e: any) {
      setErr(e.status === 402 ? "Image storage is out of credits. Choose a preset image instead." : e.message);
    } finally {
      setBusy(false);
    }
  };

  const previewUri = picked?.uri ?? preset;

  return (
    <View style={styles.root} testID="goal-new-screen">
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton testID="goal-new-close-button" name="x" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Pin a vision</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAwareScrollView bottomOffset={96} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.polaroid}>
          <View style={styles.preview}>
            {previewUri ? <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
          </View>
          <TextInput
            testID="goal-title-input"
            style={styles.title}
            placeholder="I live in a sunlit home by the sea"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
        </View>

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          {CATS.map((c) => (
            <Chip key={c} testID={`goal-category-${c.toLowerCase()}`} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>Image</Text>
        <Text style={styles.hint}>Pin a photo from your gallery that captures how this dream feels, or choose one below.</Text>
        <Pressable testID="goal-pick-photo-button" onPress={pick} style={styles.pickBtn}>
          <Feather name="upload" size={18} color={colors.onBrandTertiary} />
          <Text style={styles.pickText}>{picked ? "Change photo" : "Choose from my photos"}</Text>
        </Pressable>
        {blocked ? (
          <Pressable testID="goal-open-settings-button" onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
            <Feather name="settings" size={16} color={colors.brandPrimary} />
            <Text style={styles.settingsText}>Photo access is off. Open Settings</Text>
          </Pressable>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets} style={{ flexGrow: 0 }}>
          {PRESETS.map((p, i) => (
            <Pressable
              key={p}
              testID={`goal-preset-${i}`}
              onPress={() => {
                tap();
                setPreset(p);
                setPicked(null);
              }}
              style={[styles.presetWrap, preset === p && styles.presetOn]}
            >
              <Image source={{ uri: p }} style={styles.preset} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <ErrorText msg={err} testID="goal-new-error-text" />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button testID="goal-save-button" title="Pin to my board" icon="map-pin" onPress={save} loading={busy} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  polaroid: {
    alignSelf: "center",
    width: "78%",
    backgroundColor: c.surface,
    padding: space.md,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    transform: [{ rotate: "-1.5deg" }],
    marginTop: space.md,
  },
  preview: { aspectRatio: 0.85, backgroundColor: c.surfaceTertiary, borderRadius: 4, overflow: "hidden" },
  title: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface, paddingVertical: space.md, textAlign: "center" },
  label: { fontFamily: fonts.text, fontSize: 14, fontWeight: "800", color: c.muted, marginTop: space.xl, marginBottom: space.sm },
  hint: { fontFamily: fonts.text, fontSize: 14, color: c.muted, lineHeight: 20, marginBottom: space.md },
  chips: { gap: space.sm },
  pickBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.brandTertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  pickText: { fontFamily: fonts.text, fontSize: 15, fontWeight: "700", color: c.onBrandTertiary },
  settingsBtn: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44, justifyContent: "center" },
  settingsText: { fontFamily: fonts.text, fontSize: 14, fontWeight: "700", color: c.brandPrimary },
  presets: { gap: space.md, paddingVertical: space.md },
  presetWrap: { borderRadius: radius.md, borderWidth: 2, borderColor: "transparent", padding: 2 },
  presetOn: { borderColor: c.brandPrimary },
  preset: { width: 72, height: 88, borderRadius: radius.sm },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider },
}));
