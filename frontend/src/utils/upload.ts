/**
 * upload.ts — the ONLY way to send files (multipart) from this app.
 * Native global fetch is `expo/fetch`, which rejects RN-style `{ uri, name, type }`
 * FormData parts ("Unsupported FormDataPart implementation"). So we read the file
 * into a real Blob first and append that.
 */
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';

export type UploadFile = { uri: string; name: string; type: string };

export async function uploadForm(
  url: string,
  file: UploadFile,
  opts: { field?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  const form = new FormData();
  const blob = Platform.OS === 'web'
    ? await (await fetch(file.uri)).blob()
    : await (await expoFetch(file.uri)).blob(); // handles file:// and content:// on both platforms
  form.append(opts.field ?? 'file', blob as any, file.name);
  // Never set Content-Type: the multipart boundary is added automatically.
  const doFetch: any = Platform.OS === 'web' ? fetch : expoFetch;
  return doFetch(url, { method: 'POST', headers: opts.headers ?? {}, body: form });
}
