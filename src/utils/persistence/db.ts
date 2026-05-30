/**
 * IndexedDB Core - Low-level Database Operations
 * 
 * Security: Transaction boundaries enforced
 * Performance: All operations are non-blocking
 * Reliability: Graceful degradation for unsupported browsers
 */

import { SCHEMA_VERSION, PersistenceError, StoredDocument } from '../../types/persistence';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'CanvasDocs';
const DOCUMENTS_STORE = 'documents';
const CORRUPT_STORE = 'corrupt';

// ═══════════════════════════════════════════════════════════════
// CAPABILITY DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectStorageCapabilities(): {
  hasIndexedDB: boolean;
  estimatedQuota?: number;
  usedQuota?: number;
} {
  const hasIndexedDB = typeof indexedDB !== 'undefined' && indexedDB !== null;
  
  let estimatedQuota: number | undefined;
  let usedQuota: number | undefined;
  
  if (hasIndexedDB && navigator.storage && navigator.storage.estimate) {
    // Async - will populate later
    navigator.storage.estimate().then(estimate => {
      estimatedQuota = estimate.quota;
      usedQuota = estimate.usage;
    });
  }
  
  return { hasIndexedDB, estimatedQuota, usedQuota };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes the IndexedDB connection
 * Creates object stores and indexes on first run
 * Handles schema migrations for version upgrades
 */
export async function initDB(): Promise<IDBDatabase> {
  // Return existing instance if already initialized
  if (dbInstance) return dbInstance;
  
  // Return existing promise if initialization is in progress
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    // Check browser support
    if (!detectStorageCapabilities().hasIndexedDB) {
      reject(createPersistenceError('UNSUPPORTED_BROWSER', 'IndexedDB is not supported in this browser'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    
    // Handle upgrade (create/modify schema)
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      
      // Version 0 -> 1: Initial schema
      if (oldVersion < 1) {
        // Documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const documentsStore = db.createObjectStore(DOCUMENTS_STORE, {
            keyPath: 'docId',
            autoIncrement: true,
          });
          
          // Indexes for efficient queries
          documentsStore.createIndex('title', 'meta.title', { unique: false });
          documentsStore.createIndex('updatedAt', 'meta.updatedAt', { unique: false });
          documentsStore.createIndex('type', 'meta.type', { unique: false });
          documentsStore.createIndex('created_at_type', ['meta.createdAt', 'meta.type'], { unique: false });
        }
        
        // Corrupt documents store (for recovery)
        if (!db.objectStoreNames.contains(CORRUPT_STORE)) {
          db.createObjectStore(CORRUPT_STORE, {
            keyPath: 'docId',
          });
        }
      }
      
      // Future migrations would go here:
      // if (oldVersion < 2) { ... }
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Handle unexpected closes
      dbInstance.onclose = () => {
        dbInstance = null;
        dbInitPromise = null;
      };
      
      // Handle errors after opening
      dbInstance.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };
      
      resolve(dbInstance);
    };
    
    request.onerror = () => {
      reject(createPersistenceError('TRANSACTION_FAILED', 'Failed to open database', request.error ?? undefined));
    };
    
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another tab');
    };
  });
  
  return dbInitPromise;
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION HELPERS
// ═══════════════════════════════════════════════════════════════

type StoreName = typeof DOCUMENTS_STORE | typeof CORRUPT_STORE;
type TransactionMode = 'readonly' | 'readwrite';

function createTransaction(
  db: IDBDatabase,
  storeNames: StoreName[],
  mode: TransactionMode
): IDBTransaction {
  return db.transaction(storeNames, mode);
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Saves a document (upsert operation)
 * Automatically stamps updatedAt timestamp
 */
export async function saveDocument(doc: StoredDocument): Promise<number> {
  const db = await initDB();
  
  // Validate document structure
  const validationError = validateDocumentStructure(doc);
  if (validationError) {
    throw validationError;
  }
  
  // Stamp updatedAt
  const docToSave: StoredDocument = {
    ...doc,
    meta: {
      ...doc.meta,
      updatedAt: Date.now(),
    },
  };
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [DOCUMENTS_STORE], 'readwrite');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.put(docToSave);
      
      request.onsuccess = () => {
        const docId = request.result as number;
        resolve(docId);
      };
      
      request.onerror = () => {
        const error = request.error;
        
        // Handle quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          reject(createPersistenceError('QUOTA_EXCEEDED', 'Storage quota exceeded. Please export or delete old documents.', error));
        } else {
          reject(createPersistenceError('TRANSACTION_FAILED', 'Failed to save document', error ?? undefined));
        }
      };
      
      transaction.onerror = () => {
        reject(createPersistenceError('TRANSACTION_FAILED', 'Transaction failed', transaction.error ?? undefined));
      };
    } catch (error) {
      reject(createPersistenceError('UNKNOWN', 'Unexpected error during save', error as Error));
    }
  });
}

/**
 * Loads a document by ID
 * Returns null if not found
 * Handles corrupted data gracefully
 */
export async function loadDocument(docId: number): Promise<StoredDocument | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.get(docId);
      
      request.onsuccess = () => {
        const doc = request.result;
        
        if (!doc) {
          resolve(null);
          return;
        }
        
        // Validate loaded data
        const validationError = validateDocumentStructure(doc);
        if (validationError) {
          // Move to corrupt store
          moveToCorruptStore(db, docId, doc, validationError)
            .then(() => {
              reject(createPersistenceError('CORRUPTED_DATA', 'Document data is corrupted and has been moved to recovery', validationError, docId));
            })
            .catch(() => {
              reject(createPersistenceError('CORRUPTED_DATA', 'Document data is corrupted', validationError, docId));
            });
          return;
        }
        
        resolve(doc);
      };
      
      request.onerror = () => {
        reject(createPersistenceError('TRANSACTION_FAILED', 'Failed to load document', request.error ?? undefined));
      };
    } catch (error) {
      reject(createPersistenceError('UNKNOWN', 'Unexpected error during load', error as Error));
    }
  });
}

/**
 * Deletes a document by ID
 * Uses transaction to ensure atomicity
 */
export async function deleteDocument(docId: number): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [DOCUMENTS_STORE, CORRUPT_STORE], 'readwrite');
      
      // Delete from both stores (in case it's in corrupt)
      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      const corruptStore = transaction.objectStore(CORRUPT_STORE);
      
      documentsStore.delete(docId);
      corruptStore.delete(docId);
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        reject(createPersistenceError('TRANSACTION_FAILED', 'Failed to delete document', transaction.error ?? undefined));
      };
    } catch (error) {
      reject(createPersistenceError('UNKNOWN', 'Unexpected error during delete', error as Error));
    }
  });
}

/**
 * Lists documents with optional filtering
 * Returns metadata only (not full content)
 */
export async function listDocuments(filter?: import('../../types/persistence').DocumentFilter): Promise<import('../../types/persistence').DocumentListItem[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      
      // Choose index based on sort
      let request: IDBRequest;
      
      if (filter?.type) {
        const index = store.index('type');
        request = index.openCursor(IDBKeyRange.only(filter.type));
      } else if (filter?.sortBy === 'updatedAt') {
        const index = store.index('updatedAt');
        request = index.openCursor(null, filter.sortOrder === 'desc' ? 'prev' : 'next');
      } else {
        request = store.openCursor();
      }
      
      const results: import('../../types/persistence').DocumentListItem[] = [];
      let skipped = 0;
      
      request.onsuccess = () => {
        const cursor = request.result;
        
        if (!cursor) {
          resolve(results);
          return;
        }
        
        // Apply offset
        if (filter?.offset && skipped < filter.offset) {
          skipped++;
          cursor.continue();
          return;
        }
        
        const doc = cursor.value as StoredDocument;
        
        // Apply search filter
        if (filter?.searchTerm) {
          const searchLower = filter.searchTerm.toLowerCase();
          if (!doc.meta.title.toLowerCase().includes(searchLower)) {
            cursor.continue();
            return;
          }
        }
        
        // Extract metadata
        const item: import('../../types/persistence').DocumentListItem = {
          docId: doc.docId!,
          title: doc.meta.title,
          type: doc.meta.type,
          createdAt: doc.meta.createdAt,
          updatedAt: doc.meta.updatedAt,
          nodeCount: 'nodes' in doc.content ? Object.keys(doc.content.nodes).length : undefined,
        };
        
        results.push(item);
        
        // Apply limit
        if (filter?.limit && results.length >= filter.limit) {
          resolve(results);
          return;
        }
        
        cursor.continue();
      };
      
      request.onerror = () => {
        reject(createPersistenceError('TRANSACTION_FAILED', 'Failed to list documents', request.error ?? undefined));
      };
    } catch (error) {
      reject(createPersistenceError('UNKNOWN', 'Unexpected error during list', error as Error));
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// CORRUPT DATA HANDLING
// ═══════════════════════════════════════════════════════════════

interface CorruptDocumentEntry {
  docId: number;
  originalData: unknown;
  error: string;
  movedAt: number;
}

async function moveToCorruptStore(
  db: IDBDatabase,
  docId: number,
  originalData: unknown,
  error: PersistenceError
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [DOCUMENTS_STORE, CORRUPT_STORE], 'readwrite');
      
      const corruptStore = transaction.objectStore(CORRUPT_STORE);
      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      
      const corruptEntry: CorruptDocumentEntry = {
        docId,
        originalData,
        error: error.message,
        movedAt: Date.now(),
      };
      
      corruptStore.put(corruptEntry);
      documentsStore.delete(docId);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Lists corrupt documents for recovery UI
 */
export async function listCorruptDocuments(): Promise<CorruptDocumentEntry[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = createTransaction(db, [CORRUPT_STORE], 'readonly');
      const store = transaction.objectStore(CORRUPT_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateDocumentStructure(doc: unknown): PersistenceError | null {
  if (!doc || typeof doc !== 'object') {
    return createPersistenceError('CORRUPTED_DATA', 'Document is not an object');
  }
  
  const d = doc as Record<string, unknown>;
  
  // Check meta
  if (!d.meta || typeof d.meta !== 'object') {
    return createPersistenceError('CORRUPTED_DATA', 'Document missing meta');
  }
  
  const meta = d.meta as Record<string, unknown>;
  
  if (typeof meta.title !== 'string') {
    return createPersistenceError('CORRUPTED_DATA', 'Document meta.title is not a string');
  }
  
  if (typeof meta.type !== 'string') {
    return createPersistenceError('CORRUPTED_DATA', 'Document meta.type is not a string');
  }
  
  if (typeof meta.createdAt !== 'number') {
    return createPersistenceError('CORRUPTED_DATA', 'Document meta.createdAt is not a number');
  }
  
  if (typeof meta.updatedAt !== 'number') {
    return createPersistenceError('CORRUPTED_DATA', 'Document meta.updatedAt is not a number');
  }
  
  // Check content
  if (!d.content || typeof d.content !== 'object') {
    return createPersistenceError('CORRUPTED_DATA', 'Document missing content');
  }
  
  // Check uiState (optional but must be object if present)
  if (d.uiState !== undefined && typeof d.uiState !== 'object') {
    return createPersistenceError('CORRUPTED_DATA', 'Document uiState is not an object');
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ERROR HELPERS
// ═══════════════════════════════════════════════════════════════

function createPersistenceError(
  type: PersistenceError['type'],
  message: string,
  originalError?: Error,
  docId?: number
): PersistenceError {
  const err = new Error(message) as PersistenceError;
  err.type = type;
  err.message = message;
  err.name = 'PersistenceError';
  err.originalError = originalError;
  if (docId !== undefined) err.docId = docId;
  return err;
}

// ═══════════════════════════════════════════════════════════════
// QUOTA MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export async function getStorageEstimate(): Promise<{ quota: number; usage: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
    };
  }
  return { quota: 0, usage: 0 };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}