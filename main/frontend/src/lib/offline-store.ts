/**
 * Offline-first answer queue.
 *
 * IndexedDB-backed queue of pending Line Check answers. The run page enqueues
 * every answer locally first; a background sync drains the queue against the
 * API when the network comes back. Photos are stored as Blobs in the same DB.
 */

import { lineCheckApi } from "./line-check-api"

const DB_NAME = "aentro-line-check"
const DB_VERSION = 1
const ANSWER_STORE = "pending_answers"
const PHOTO_STORE = "pending_photos"

export interface PendingAnswer {
  id: string
  runId: string
  itemId: string
  valueText?: string | null
  valueNumber?: number | null
  photoBlobId?: string | null
  comment?: string | null
  createdAt: number
}

export interface PendingPhoto {
  id: string
  blob: Blob
  createdAt: number
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(ANSWER_STORE)) {
        db.createObjectStore(ANSWER_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const s = t.objectStore(store)
    const req = fn(s)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const offlineStore = {
  async queueAnswer(answer: Omit<PendingAnswer, "id" | "createdAt">): Promise<string> {
    if (!isBrowser()) return ""
    const id = uuid()
    const rec: PendingAnswer = { ...answer, id, createdAt: Date.now() }
    await tx(ANSWER_STORE, "readwrite", (s) => s.put(rec))
    return id
  },

  async listAnswers(): Promise<PendingAnswer[]> {
    if (!isBrowser()) return []
    return await tx<PendingAnswer[]>(ANSWER_STORE, "readonly", (s) => s.getAll() as IDBRequest<PendingAnswer[]>)
  },

  async deleteAnswer(id: string): Promise<void> {
    if (!isBrowser()) return
    await tx(ANSWER_STORE, "readwrite", (s) => s.delete(id))
  },

  async storePhoto(blob: Blob): Promise<string> {
    if (!isBrowser()) return ""
    const id = uuid()
    await tx(PHOTO_STORE, "readwrite", (s) => s.put({ id, blob, createdAt: Date.now() }))
    return id
  },

  async getPhoto(id: string): Promise<Blob | undefined> {
    if (!isBrowser()) return undefined
    const rec = await tx<PendingPhoto | undefined>(PHOTO_STORE, "readonly", (s) => s.get(id) as IDBRequest<PendingPhoto | undefined>)
    return rec?.blob
  },

  async deletePhoto(id: string): Promise<void> {
    if (!isBrowser()) return
    await tx(PHOTO_STORE, "readwrite", (s) => s.delete(id))
  },

  async sync(): Promise<{ synced: number; failed: number }> {
    if (!isBrowser()) return { synced: 0, failed: 0 }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { synced: 0, failed: 0 }
    }
    const pending = await this.listAnswers()
    let synced = 0
    let failed = 0
    for (const a of pending) {
      try {
        let photoUrl: string | null = null
        if (a.photoBlobId) {
          const blob = await this.getPhoto(a.photoBlobId)
          if (blob) {
            const up = await lineCheckApi.uploadPhoto(blob, a.runId)
            photoUrl = up.photo_url
          }
        }
        await lineCheckApi.submitAnswer(a.runId, {
          item_id: a.itemId,
          value_text: a.valueText ?? null,
          value_number: a.valueNumber ?? null,
          photo_url: photoUrl,
          comment: a.comment ?? null,
        })
        await this.deleteAnswer(a.id)
        if (a.photoBlobId) await this.deletePhoto(a.photoBlobId)
        synced += 1
      } catch {
        failed += 1
      }
    }
    return { synced, failed }
  },
}

// Auto-sync hook: drain queue on reconnect.
if (isBrowser()) {
  window.addEventListener("online", () => {
    offlineStore.sync().catch(() => {})
  })
}
