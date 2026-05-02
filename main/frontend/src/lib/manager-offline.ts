/**
 * Offline submission queue for the manager PWA.
 *
 * Each form (daily report / waste / complaint / equipment) enqueues its
 * payload into IndexedDB. On reconnect (or manual flush), we drain the
 * queue against the real API. Photos ride in the existing `pending_photos`
 * store from `offline-store.ts`.
 */

import { managerApi } from "./manager-api"
import { offlineStore } from "./offline-store"

const DB_NAME = "aentro-manager"
const DB_VERSION = 1
const STORE = "submissions"

export type SubmissionKind =
  | "daily_report"
  | "waste_log"
  | "complaint"
  | "equipment_issue"

export interface PendingSubmission {
  id: string
  kind: SubmissionKind
  payload: Record<string, unknown>
  photoBlobId?: string | null
  createdAt: number
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined"
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const s = t.objectStore(STORE)
        const req = fn(s)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

export const managerOffline = {
  async enqueue(
    kind: SubmissionKind,
    payload: Record<string, unknown>,
    photoBlob?: Blob
  ): Promise<string> {
    if (!isBrowser()) return ""
    let photoBlobId: string | null = null
    if (photoBlob) photoBlobId = await offlineStore.storePhoto(photoBlob)
    const rec: PendingSubmission = {
      id: uuid(),
      kind,
      payload,
      photoBlobId,
      createdAt: Date.now(),
    }
    await tx("readwrite", (s) => s.put(rec))
    return rec.id
  },

  async list(): Promise<PendingSubmission[]> {
    if (!isBrowser()) return []
    return await tx<PendingSubmission[]>("readonly", (s) => s.getAll() as IDBRequest<PendingSubmission[]>)
  },

  async remove(id: string): Promise<void> {
    if (!isBrowser()) return
    await tx("readwrite", (s) => s.delete(id))
  },

  async sync(): Promise<{ synced: number; failed: number }> {
    if (!isBrowser()) return { synced: 0, failed: 0 }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { synced: 0, failed: 0 }
    }
    const pending = await this.list()
    let synced = 0
    let failed = 0
    for (const item of pending) {
      try {
        // photoBlob → for now pass blob:URL; backend upload contract TBD
        if (item.photoBlobId) {
          const blob = await offlineStore.getPhoto(item.photoBlobId)
          if (blob) {
            ;(item.payload as Record<string, unknown>).photo_url =
              `blob:pending/${item.photoBlobId}`
          }
        }
        switch (item.kind) {
          case "daily_report":
            await managerApi.postDailyReport(item.payload as never)
            break
          case "waste_log":
            await managerApi.postWasteLog(item.payload as never)
            break
          case "complaint":
            await managerApi.postComplaint(item.payload as never)
            break
          case "equipment_issue":
            await managerApi.postEquipmentIssue(item.payload as never)
            break
        }
        await this.remove(item.id)
        if (item.photoBlobId) await offlineStore.deletePhoto(item.photoBlobId)
        synced += 1
      } catch {
        failed += 1
      }
    }
    return { synced, failed }
  },
}

if (isBrowser()) {
  window.addEventListener("online", () => {
    managerOffline.sync().catch(() => {})
  })
}
