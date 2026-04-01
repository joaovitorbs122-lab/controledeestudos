/* ═══════════════════════════════════════════════════════
   Controle de Estudo — db.js  (IndexedDB wrapper)
   ═══════════════════════════════════════════════════════ */

const DB_NAME    = 'studyboard';
const DB_VERSION = 3;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('simulados')) {
        const s = d.createObjectStore('simulados', { keyPath: 'id', autoIncrement: true });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!d.objectStoreNames.contains('enem')) {
        const s = d.createObjectStore('enem', { keyPath: 'id', autoIncrement: true });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!d.objectStoreNames.contains('fuvest')) {
        const s = d.createObjectStore('fuvest', { keyPath: 'id', autoIncrement: true });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!d.objectStoreNames.contains('revisoes')) {
        const s = d.createObjectStore('revisoes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('materia', 'materia', { unique: false });
      }
      if (!d.objectStoreNames.contains('erros')) {
        const s = d.createObjectStore('erros', { keyPath: 'id', autoIncrement: true });
        s.createIndex('materia', 'materia', { unique: false });
      }
      if (!d.objectStoreNames.contains('config')) {
        d.createObjectStore('config', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('redacoes_enem')) {
        const s = d.createObjectStore('redacoes_enem', { keyPath: 'id', autoIncrement: true });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!d.objectStoreNames.contains('redacoes_gerais')) {
        const s = d.createObjectStore('redacoes_gerais', { keyPath: 'id', autoIncrement: true });
        s.createIndex('data', 'data', { unique: false });
      }
      if (!d.objectStoreNames.contains('repertorios')) {
        const s = d.createObjectStore('repertorios', { keyPath: 'id', autoIncrement: true });
        s.createIndex('eixo', 'eixo', { unique: false });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function dbSave(store, obj) {
  return openDB().then(d => new Promise((res, rej) => {
    const tx  = d.transaction(store, 'readwrite');
    const os  = tx.objectStore(store);
    // For stores with autoIncrement (keyPath='id'), use add for new records and put for existing.
    // For the 'config' store (keyPath='key', no autoIncrement), always use put to upsert.
    const req = (store === 'config' || obj.id)
      ? os.put(obj)
      : os.add(obj);
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  }));
}

function dbGetAll(store) {
  return openDB().then(d => new Promise((res, rej) => {
    const tx  = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  }));
}

function dbGet(store, id) {
  return openDB().then(d => new Promise((res, rej) => {
    const tx  = d.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  }));
}

function dbDelete(store, id) {
  return openDB().then(d => new Promise((res, rej) => {
    const tx  = d.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  }));
}

async function dbExportAll() {
  const stores = ['simulados','enem','fuvest','revisoes','erros','config','redacoes_enem','redacoes_gerais','repertorios'];
  const data   = {};
  for (const s of stores) { data[s] = await dbGetAll(s); }
  return data;
}

async function dbImportAll(data) {
  const stores = ['simulados','enem','fuvest','revisoes','erros','config','redacoes_enem','redacoes_gerais','repertorios'];
  const d = await openDB();
  for (const s of stores) {
    if (!data[s]) continue;
    await new Promise((res, rej) => {
      const tx = d.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      tx.oncomplete = () => res();
      tx.onerror = (e) => rej(e.target.error);
    });
    for (const item of data[s]) { await dbSave(s, item); }
  }
}
