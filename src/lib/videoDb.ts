const DB_NAME = "vocal_ai_video_database";
const DB_VERSION = 1;
const STORE_NAME = "interview_videos";

export interface SavedVideo {
  questionId: string;
  interviewId: string;
  mimeType: string;
  blob: Blob;
  created_at: string;
}

export const videoDb = {
  dbPromise: null as Promise<IDBDatabase> | null,

  init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "questionId" });
          store.createIndex("interviewId", "interviewId", { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        console.error("IndexedDB open error:", event.target.error);
        reject(event.target.error);
      };
    });

    return this.dbPromise;
  },

  async saveVideo(questionId: string, interviewId: string, mimeType: string, blob: Blob): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      
      const record: SavedVideo = {
        questionId,
        interviewId,
        mimeType,
        blob,
        created_at: new Date().toISOString()
      };

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = (event: any) => reject(event.target.error);
    });
  },

  async getVideo(questionId: string): Promise<SavedVideo | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(questionId);

      request.onsuccess = (event: any) => {
        resolve(event.target.result || null);
      };
      request.onerror = (event: any) => reject(event.target.error);
    });
  },

  async getVideosForInterview(interviewId: string): Promise<SavedVideo[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("interviewId");
      const request = index.getAll(interviewId);

      request.onsuccess = (event: any) => {
        resolve(event.target.result || []);
      };
      request.onerror = (event: any) => reject(event.target.error);
    });
  },

  async deleteVideosForInterview(interviewId: string): Promise<void> {
    const db = await this.init();
    const videos = await this.getVideosForInterview(interviewId);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      let count = 0;
      if (videos.length === 0) {
        resolve();
        return;
      }

      videos.forEach((video) => {
        const req = store.delete(video.questionId);
        req.onsuccess = () => {
          count++;
          if (count === videos.length) {
            resolve();
          }
        };
        req.onerror = (event: any) => reject(event.target.error);
      });
    });
  }
};
