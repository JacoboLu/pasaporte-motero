export type QueuedPhotoVisit = {
  id: string
  userId: string
  destinationId: number
  visitedAt: string
  note: string
  blob: Blob
}

const DB_NAME = 'pasaporte-motero-offline'
const STORE = 'photo-visits'
const DB_VERSION = 1

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite almacenamiento local persistente.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('createdAt', 'visitedAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('No se pudo abrir la cola local.'))
  })
}

export async function addQueuedPhotoVisit(item: QueuedPhotoVisit): Promise<void> {
  const db = await openQueueDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la evidencia.'))
      tx.onabort = () => reject(tx.error || new Error('Se canceló el guardado local.'))
    })
  } finally { db.close() }
}

export async function getQueuedPhotoVisits(userId?: string): Promise<QueuedPhotoVisit[]> {
  const db = await openQueueDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const request = userId ? store.index('userId').getAll(userId) : store.getAll()
      request.onsuccess = () => resolve((request.result || []) as QueuedPhotoVisit[])
      request.onerror = () => reject(request.error || new Error('No se pudo leer la cola local.'))
    })
  } finally { db.close() }
}

export async function removeQueuedPhotoVisit(id: string): Promise<void> {
  const db = await openQueueDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('No se pudo retirar la evidencia sincronizada.'))
    })
  } finally { db.close() }
}
