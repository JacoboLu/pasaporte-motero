const DB_NAME = 'pasaporte-motero-secure'
const STORE_NAME = 'crypto'
const KEY_ID = 'local-cache-aes-gcm-v1'
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

async function getEncryptionKey(): Promise<CryptoKey> {
  const db = await openKeyDb()
  try {
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY_ID)
      request.onsuccess = () => resolve(request.result as CryptoKey | undefined)
      request.onerror = () => reject(request.error)
    })
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(key, KEY_ID)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    return key
  } finally {
    db.close()
  }
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

/** Removes all private cached data and the non-extractable device key on sign-out. */
export async function clearPrivateCache(): Promise<void> {
  for (const key of PRIVATE_KEYS) {
    localStorage.removeItem(key)
    localStorage.removeItem(`pm_secure_${key}`)
  }
  await new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = request.onerror = request.onblocked = () => resolve()
  })
}
