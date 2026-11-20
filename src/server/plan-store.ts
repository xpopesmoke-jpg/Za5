import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded Plan files live: a folder on the server's persistent volume (PLAN_DIR). Keys are
 * "<planId>/<file>"; tests use the in-memory store.
 */
export type PlanStore = {
  put(key: string, data: Buffer): Promise<void>;
  /** null when there is no such file */
  get(key: string): Promise<Buffer | null>;
  /** Removes every file under "<prefix>/" */
  removeAll(prefix: string): Promise<void>;
  list(): Promise<string[]>;
};

const safe = (key: string) => {
  if (!/^[0-9a-f-]{36}(\/[a-z0-9-]+\.[a-z0-9]+)?$/.test(key)) throw new Error(`Bad plan file key: ${key}`);
  return key;
};

export function folderPlanStore(dir: string): PlanStore {
  const at = (key: string) => path.join(dir, safe(key));
  return {
    async put(key, data) {
      await mkdir(path.dirname(at(key)), { recursive: true });
      await writeFile(at(key), data);
    },
    async get(key) {
      try {
        return await readFile(at(key));
      } catch {
        return null;
      }
    },
    async removeAll(prefix) {
      await rm(at(prefix), { recursive: true, force: true });
    },
    async list() {
      const out: string[] = [];
      for (const d of await readdir(dir).catch(() => [] as string[])) {
        for (const f of await readdir(path.join(dir, d)).catch(() => [] as string[])) out.push(`${d}/${f}`);
      }
      return out;
    },
  };
}

export function memoryPlanStore(): PlanStore {
  const files = new Map<string, Buffer>();
  return {
    async put(key, data) {
      files.set(safe(key), data);
    },
    async get(key) {
      return files.get(safe(key)) ?? null;
    },
    async removeAll(prefix) {
      for (const k of [...files.keys()]) if (k.startsWith(`${safe(prefix)}/`)) files.delete(k);
    },
    async list() {
      return [...files.keys()];
    },
  };
}

let shared: PlanStore | null = null;
/** The app's store: PLAN_DIR, or .data/plans next to the local database. */
export const planStore = () => (shared ??= folderPlanStore(process.env.PLAN_DIR || path.join(process.cwd(), ".data", "plans")));
