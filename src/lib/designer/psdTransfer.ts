// ===========================================================================
// PSD Transfer — IndexedDB helper to pass PSD files between dashboard → editor
// Used when importing PSD from the home page to auto-create a project
// ===========================================================================

const DB_NAME = 'phoxta_psd_transfer'
const STORE_NAME = 'pending_psd'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Store a PSD file for later retrieval by the editor page. */
export async function storePendingPsd(key: string, file: File): Promise<void> {
  const db = await openDB()
  const buffer = await file.arrayBuffer()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(
      { name: file.name, buffer, type: file.type },
      key
    )
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Retrieve and delete a pending PSD file. Returns null if not found. */
export async function retrievePendingPsd(key: string): Promise<File | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(key)

    getReq.onsuccess = () => {
      const data = getReq.result
      if (!data) {
        resolve(null)
        return
      }
      // Delete after retrieval (one-time use)
      store.delete(key)
      const file = new File([data.buffer], data.name, { type: data.type || 'application/octet-stream' })
      resolve(file)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
