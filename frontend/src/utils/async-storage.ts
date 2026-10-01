// Raw-string key/value adapter with the AsyncStorage API, backed by the
// pre-shipped storage util (used by the ported original Hera code).
import { storage } from "@/src/utils/storage";

const INDEX_KEY = "__hera_keys";

async function keys(): Promise<string[]> {
  const raw = await storage.getItem<string | null>(INDEX_KEY, null);
  return raw ? (JSON.parse(raw) as string[]) : [];
}
async function track(key: string, add: boolean) {
  const k = new Set(await keys());
  if (add) k.add(key);
  else k.delete(key);
  await storage.setItem(INDEX_KEY, JSON.stringify([...k]));
}

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return storage.getItem<string | null>(key, null);
  },
  async setItem(key: string, value: string): Promise<void> {
    await storage.setItem(key, value);
    await track(key, true);
  },
  async removeItem(key: string): Promise<void> {
    await storage.removeItem(key);
    await track(key, false);
  },
  async multiRemove(list: string[]): Promise<void> {
    for (const k of list) await AsyncStorage.removeItem(k);
  },
  async clear(): Promise<void> {
    for (const k of await keys()) await storage.removeItem(k);
    await storage.removeItem(INDEX_KEY);
  },
};

export default AsyncStorage;
