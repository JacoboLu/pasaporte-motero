const DB_NAME = 'pasaporte-motero-secure'
const STORE_NAME = 'crypto'
const KEY_ID = 'local-cache-aes-gcm-v1'
const OFFLINE_KEY_ID = 'offline-photo-aes-gcm-v1'
const OFFLINE_BLOB_TYPE = 'application/x-pasaporte-motero-encrypted'
const PRIVATE_KEYS = ['pm_visits', 'pm_posts', 'pm_trips', 'pm_saved', 'pm_followed', 'pm_name', 'pm_username', 'pm_bio', 'pm_city']

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Share key initialization between concurrent callers in this tab. The IndexedDB
// read-write transaction also serializes first-time creation across tabs.
const encryptionKeyPromises = new Map<string, Promise<CryptoKey>>()

function getEncryptionKey(keyId = KEY_ID): Promise<CryptoKey> {
  const pending = encryptionKeyPromises.get(keyId)
  if (pending) return pending

  const initialization = (async (): Promise<CryptoKey> => {
    if (!globalThis.crypto?.subtle) throw new Error('Este navegador no ofrece cifrado seguro.')
    const candidate = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
    const db = await openKeyDb()
    try {
      return await new Promise<CryptoKey>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(keyId)
        let selectedKey: CryptoKey | undefined

        request.onsuccess = () => {
          const existing = request.result as CryptoKey | undefined
          if (existing) {
            selectedKey = existing
            return
          }
          selectedKey = candidate
          store.put(candidate, keyId)
        }
        request.onerror = () => reject(request.error || new Error('No se pudo recuperar la clave de cifrado.'))
        transaction.oncomplete = () => {
          if (selectedKey) resolve(selectedKey)
          else reject(new Error('No se pudo inicializar la clave de cifrado.'))
        }
        transaction.onerror = () => reject(transaction.error || new Error('Falló la transacción de la clave de cifrado.'))
        transaction.onabort = () => reject(transaction.error || new Error('Se canceló la inicialización de la clave de cifrado.'))
      })
    } finally {
      db.close()
    }
  })()

  encryptionKeyPromises.set(keyId, initialization)
  initialization.catch(() => {
    if (encryptionKeyPromises.get(keyId) === initialization) encryptionKeyPromises.delete(keyId)
  })
  return initialization
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function encryptValue(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador no ofrece cifrado seguro.')
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))
  return JSON.stringify({ version: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) })
}

/** Encrypts offline photo evidence with a separate device key that survives sign-out. */
export async function encryptOfflineBlob(blob: Blob): Promise<Blob> {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador no ofrece cifrado seguro para evidencias sin conexión.')
  const key = await getEncryptionKey(OFFLINE_KEY_ID)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer())
  const envelope = JSON.stringify({ version: 1, type: blob.type || 'application/octet-stream', iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) })
  return new Blob([envelope], { type: OFFLINE_BLOB_TYPE })
}

/** Decrypts offline evidence while preserving the original MIME type. */
export async function decryptOfflineBlob(blob: Blob): Promise<Blob> {
  if (blob.type !== OFFLINE_BLOB_TYPE) return blob
  const envelope = JSON.parse(await blob.text()) as { version: number; type: string; iv: string; data: string }
  if (envelope.version !== 1 || !envelope.iv || !envelope.data) throw new Error('La evidencia local cifrada no tiene un formato válido.')
  const key = await getEncryptionKey(OFFLINE_KEY_ID)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data))
  return new Blob([decrypted], { type: envelope.type || 'application/octet-stream' })
}

async function decryptValue(value: string): Promise<string> {
  const envelope = JSON.parse(value) as { version: number; iv: string; data: string }
  if (envelope.version !== 1 || !envelope.iv || !envelope.data) throw new Error('Formato de caché no válido.')
  const key = await getEncryptionKey()
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data))
  return new TextDecoder().decode(decrypted)
}

/** Encrypts a private cache value before it reaches localStorage. */
export async function writePrivateCache(key: string, value: unknown): Promise<void> {
  const encrypted = await encryptValue(JSON.stringify(value))
  localStorage.setItem(`pm_secure_${key}`, encrypted)
}

/** Reads and decrypts a private cache value; returns fallback if absent or unreadable. */
export async function readPrivateCache<T>(key: string, fallback: T): Promise<T> {
  const encrypted = localStorage.getItem(`pm_secure_${key}`)
  if (!encrypted) return fallback
  try { return JSON.parse(await decryptValue(encrypted)) as T } catch { return fallback }
}

/** One-time migration: encrypt old plaintext values, then remove the plaintext copies. */
export async function migrateLegacyPrivateCache(): Promise<void> {
  for (const key of PRIVATE_KEYS) {
    const plaintext = localStorage.getItem(key)
    if (plaintext === null) continue
    const encryptedKey = `pm_secure_${key}`
    if (!localStorage.getItem(encryptedKey)) {
      try { localStorage.setItem(encryptedKey, await encryptValue(plaintext)) } catch {
        // If encryption is unavailable, preserve the original data rather than destroy it.
        continue
      }
    }
    localStorage.removeItem(key)
  }
}

/** Clears account cache and the auth key on sign-out, but preserves the offline-evidence key. */
export async function clearPrivateCache(): Promise<void> {
  for (const key of PRIVATE_KEYS) {
    localStorage.removeItem(key)
    localStorage.removeItem(`pm_secure_${key}`)
  }
  const db = await openKeyDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('No se pudo limpiar la clave de sesión.'))
      tx.onabort = () => reject(tx.error || new Error('Se canceló la limpieza de la clave de sesión.'))
    })
    encryptionKeyPromises.delete(KEY_ID)
  } finally { db.close() }
}

/** Supabase Auth custom storage: session and refresh tokens are encrypted at rest too. */
export const encryptedAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const value = localStorage.getItem(key)
    if (value === null) return null
    try {
      const parsed = JSON.parse(value)
      if (parsed?.version === 1 && parsed?.iv && parsed?.data) return await decryptValue(value)
    } catch { /* Existing Supabase sessions were stored as plaintext JSON; migrate them below. */ }
    try {
      localStorage.setItem(key, await encryptValue(value))
      return value
    } catch {
      // Fail closed: don't return a plaintext token if secure storage cannot be initialized.
      return null
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, await encryptValue(value))
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
  }
}
