/**
 * avatarService.ts
 * Handles avatar upload, retrieval, and removal for Hera profiles.
 * Stores images in the 'avatars' Supabase Storage bucket.
 */
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@/src/utils/async-storage';
import { Platform } from 'react-native';

const BUCKET = 'avatars';
const AVATAR_URI_KEY = '@hera_avatar_uri';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ask for media library permissions and open the image picker.
 * Returns the local URI selected, or null if cancelled / denied.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/**
 * Upload a local image URI to Supabase Storage under the authenticated user's folder.
 * Returns the public URL, or throws on error.
 */
export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  const supabase = getSupabaseClient();

  // Derive filename and mime type from URI
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/avatar.${ext}`;

  let uploadData: ArrayBuffer;

  if (Platform.OS === 'web') {
    // Web: fetch → blob → arrayBuffer
    const resp = await fetch(localUri);
    const blob = await resp.blob();
    uploadData = await blob.arrayBuffer();
  } else {
    // Mobile: fetch file:// URI → blob → base64 → ArrayBuffer
    const resp = await fetch(localUri);
    const blob = await resp.blob();
    uploadData = await blobToArrayBuffer(blob);
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadData, { contentType: mime, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Append cache-buster so Expo Image reloads after re-upload
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
  await AsyncStorage.setItem(AVATAR_URI_KEY, publicUrl);
  return publicUrl;
}

/**
 * Remove the user's avatar from Storage and clear local cache.
 */
export async function removeAvatar(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  // Try common extensions
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await supabase.storage.from(BUCKET).remove([`${userId}/avatar.${ext}`]).catch(() => {});
  }
  await AsyncStorage.removeItem(AVATAR_URI_KEY);
}

/**
 * Load the cached avatar URL from AsyncStorage (fast local read).
 */
export async function loadCachedAvatarUrl(): Promise<string | null> {
  return AsyncStorage.getItem(AVATAR_URI_KEY);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
