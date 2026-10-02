/**
 * avatarService.ts
 * Avatar pick / upload / removal backed by Emergent Object Storage (POST /api/upload)
 * and saved on the profile via PATCH /api/auth/me { avatar_path }.
 */
import * as ImagePicker from 'expo-image-picker';
import { api, uploadImage, fileSource } from '@/src/api';

export type PickResult =
  | { status: 'picked'; uri: string; name: string; type: string }
  | { status: 'cancelled' }
  | { status: 'denied'; canAskAgain: boolean };

/** Check/request photo-library permission, then open the picker. */
export async function pickAvatarImage(): Promise<PickResult> {
  let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const a = result.assets[0];
  const type = a.mimeType ?? 'image/jpeg';
  const ext = type.split('/')[1] ?? 'jpg';
  return { status: 'picked', uri: a.uri, name: a.fileName ?? `avatar.${ext}`, type };
}

/** Upload to object storage, save on profile, return a displayable URL. */
export async function uploadAvatar(uri: string, name: string, type: string): Promise<string> {
  const path = await uploadImage(uri, name, type);
  await api('/auth/me', { method: 'PATCH', body: { avatar_path: path } });
  return fileSource(path).uri;
}

/** Clear the avatar from the profile. */
export async function removeAvatar(): Promise<void> {
  await api('/auth/me', { method: 'PATCH', body: { avatar_path: '' } });
}

/** Load the saved avatar URL from the signed-in profile. */
export async function loadAvatarUrl(): Promise<string | null> {
  const me: any = await api('/auth/me');
  return me?.avatar_path ? fileSource(me.avatar_path).uri : null;
}
