// The IndexedDB attempt store. Local first, always (driver D4): the classroom
// has bad connectivity and no attempt may be lost. Append only; validate on
// write and on read; no update method exists on the interface, because an
// interface that offers one will eventually be used (SDD-MBPT-001 section 5.3).

import { validateAttemptRecord, type AttemptRecord } from "@mbpt/core";

const DB_NAME = "mbpt";
const STORE = "attempts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE, { keyPath: "attempt_id" });
      store.createIndex("seq", "seq", { unique: true });
      store.createIndex("learner_id", "learner_id");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbAttemptStore {
  async write(record: AttemptRecord): Promise<void> {
    const valid = validateAttemptRecord(record); // invariant I-4, at the door
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      // add(), never put(): an existing attempt_id is an error, not an update.
      tx.objectStore(STORE).add(valid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }

  async read(id: string): Promise<AttemptRecord | null> {
    const db = await openDb();
    const result = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result === null ? null : validateAttemptRecord(result);
  }

  async query(filter: { learner_id?: string; activity_id?: string }): Promise<AttemptRecord[]> {
    const db = await openDb();
    const all = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return all
      .map((r) => validateAttemptRecord(r))
      .filter(
        (r) =>
          (filter.learner_id === undefined || r.learner_id === filter.learner_id) &&
          (filter.activity_id === undefined || r.activity_id === filter.activity_id),
      )
      .sort((a, b) => a.seq - b.seq);
  }

  async nextSeq(): Promise<number> {
    const all = await this.query({});
    return all.length === 0 ? 1 : all[all.length - 1]!.seq + 1;
  }

  async exportAll(): Promise<string> {
    const all = await this.query({});
    return JSON.stringify({ exported_app_version: "0.1.0", attempts: all }, null, 2);
  }
}

export const attemptStore = new IndexedDbAttemptStore();
