// Mock Firebase implementation for development
// Create a simple event emitter implementation for the browser
class SimpleEventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// Mock Firestore
class MockFirestore {
  private collections: Record<string, MockCollection> = {};

  collection(path: string): MockCollection {
    if (!this.collections[path]) {
      this.collections[path] = new MockCollection(path);
    }
    return this.collections[path];
  }

  doc(path: string): MockDocument {
    const parts = path.split('/');
    const collectionPath = parts.slice(0, parts.length - 1).join('/');
    const docId = parts[parts.length - 1];
    return this.collection(collectionPath).doc(docId);
  }
}

class MockCollection {
  private documents: Record<string, MockDocument> = {};
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  doc(id?: string): MockDocument {
    const docId = id || `auto-id-${Math.random().toString(36).substring(2, 15)}`;
    if (!this.documents[docId]) {
      this.documents[docId] = new MockDocument(docId, this.path);
    }
    return this.documents[docId];
  }

  async get(): Promise<MockQuerySnapshot> {
    return {
      docs: Object.values(this.documents),
      empty: Object.keys(this.documents).length === 0,
      size: Object.keys(this.documents).length,
      forEach(callback: (doc: MockDocument) => void) {
        Object.values(this.documents).forEach(callback);
      }
    };
  }

  where(): MockQuery {
    return new MockQuery(this);
  }

  orderBy(): MockQuery {
    return new MockQuery(this);
  }

  limit(): MockQuery {
    return new MockQuery(this);
  }
}

class MockDocument {
  private id: string;
  private data: any = null;
  private path: string;
  private exists: boolean = false;

  constructor(id: string, collectionPath: string) {
    this.id = id;
    this.path = `${collectionPath}/${id}`;
  }

  async get(): Promise<MockDocumentSnapshot> {
    return {
      id: this.id,
      data: () => this.data,
      exists: this.exists
    };
  }

  async set(data: any): Promise<void> {
    this.data = { ...data, id: this.id };
    this.exists = true;
    console.log(`[MOCK] Document set at ${this.path}:`, this.data);
  }

  async update(data: any): Promise<void> {
    if (!this.exists) {
      throw new Error(`Document ${this.path} does not exist`);
    }
    this.data = { ...this.data, ...data };
    console.log(`[MOCK] Document updated at ${this.path}:`, this.data);
  }

  async delete(): Promise<void> {
    this.data = null;
    this.exists = false;
    console.log(`[MOCK] Document deleted at ${this.path}`);
  }
}

class MockQuery {
  private collection: MockCollection;

  constructor(collection: MockCollection) {
    this.collection = collection;
  }

  where(): MockQuery {
    return this;
  }

  orderBy(): MockQuery {
    return this;
  }

  limit(): MockQuery {
    return this;
  }

  async get(): Promise<MockQuerySnapshot> {
    return this.collection.get();
  }
}

interface MockDocumentSnapshot {
  id: string;
  data: () => any;
  exists: boolean;
}

interface MockQuerySnapshot {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
}

// Mock Auth
class MockAuth extends SimpleEventEmitter {
  private currentUser: any = null;

  constructor() {
    super();
    // Initialize with a mock user for development
    this.currentUser = {
      uid: 'mock-user-id',
      email: 'mock@example.com',
      displayName: 'Mock User'
    };
  }

  onAuthStateChanged(callback: (user: any) => void): () => void {
    callback(this.currentUser);
    this.on('auth-change', callback);
    return () => this.off('auth-change', callback);
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
    console.log(`[MOCK] Sign in with email: ${email}`);
    this.currentUser = {
      uid: 'mock-user-id',
      email,
      displayName: 'Mock User'
    };
    this.emit('auth-change', this.currentUser);
    return { user: this.currentUser };
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<any> {
    console.log(`[MOCK] Create user with email: ${email}`);
    this.currentUser = {
      uid: `mock-user-${Math.random().toString(36).substring(2, 15)}`,
      email,
      displayName: 'New Mock User'
    };
    this.emit('auth-change', this.currentUser);
    return { user: this.currentUser };
  }

  async signOut(): Promise<void> {
    console.log('[MOCK] Sign out');
    this.currentUser = null;
    this.emit('auth-change', null);
  }
}

// Mock Analytics
class MockAnalytics {
  logEvent(eventName: string, eventParams?: any): void {
    console.log(`[MOCK] Analytics event: ${eventName}`, eventParams);
  }
}

// Mock Firebase App
class MockApp {
  private name: string;
  private options: any;

  constructor(name: string, options: any) {
    this.name = name;
    this.options = options;
    console.log(`[MOCK] Firebase app initialized: ${name}`, options);
  }

  getName(): string {
    return this.name;
  }
}

// Export mock Firebase functions
export function initializeApp(options: any): MockApp {
  return new MockApp('default', options);
}

export function getFirestore(app?: any): MockFirestore {
  return new MockFirestore();
}

export function getAuth(app?: any): MockAuth {
  return new MockAuth();
}

export function getAnalytics(app?: any): MockAnalytics {
  return new MockAnalytics();
}

// Mock Firestore functions
export const collection = (firestore: MockFirestore, path: string) => firestore.collection(path);
export const doc = (firestore: MockFirestore, path: string) => firestore.doc(path);
export const getDoc = async (docRef: MockDocument) => docRef.get();
export const getDocs = async (query: MockQuery) => query.get();
export const setDoc = async (docRef: MockDocument, data: any) => docRef.set(data);
export const updateDoc = async (docRef: MockDocument, data: any) => docRef.update(data);
export const deleteDoc = async (docRef: MockDocument) => docRef.delete();
export const query = (collectionRef: MockCollection) => new MockQuery(collectionRef);
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const Timestamp = {
  now: () => ({ toDate: () => new Date() }),
  fromDate: (date: Date) => ({ toDate: () => date })
};
export const arrayUnion = (...items: any[]) => ({ __arrayUnion: items });
export const increment = (n: number) => ({ __increment: n });

// Export mock Firebase
export default {
  initializeApp,
  getFirestore,
  getAuth,
  getAnalytics
};
