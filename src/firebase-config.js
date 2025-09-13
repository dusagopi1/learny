import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Import getStorage

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyA718r-KQGQ4MBt9ypMrwWTljyWUzlhWug",
  authDomain: "fir-uploadexample-34626.firebaseapp.com",
  databaseURL: "https://fir-uploadexample-34626-default-rtdb.firebaseio.com",
  projectId: "fir-uploadexample-34626",
  storageBucket: "fir-uploadexample-34626.appspot.com",
  messagingSenderId: "356561872250",
  appId: "1:356561872250:web:591d76c2693b4a1542a2c3",
  measurementId: "G-X73H1GHMBT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Export storage

export default app;


