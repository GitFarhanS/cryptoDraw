const DB_NAME = 'cryptoDraw.canvases';
const DB_VERSION = 1;
const STORE_NAME = 'canvases';

export interface CanvasRecord {
    id: string;
    name: string;
    order: number;
    updatedAt: number;
    placedBlocks: any[];
    edges: any[];
}

function openDb() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('order', 'order');
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function requestToPromise<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function transactionDone(tx: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
    });
}

export async function getAllCanvases(): Promise<CanvasRecord[]> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await requestToPromise(store.getAll());
    db.close();
    return result;
}

export async function getCanvasById(id: string): Promise<CanvasRecord | null> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await requestToPromise(store.get(id));
    db.close();
    return result ?? null;
}

export async function saveCanvas(record: CanvasRecord): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.put(record));
    await transactionDone(tx);
    db.close();
}

export async function deleteCanvasById(id: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.delete(id));
    await transactionDone(tx);
    db.close();
}
