import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase configuration (fixed)
const firebaseConfig = {
  apiKey: "AIzaSyDRDv_3GC88iBnM7mDJs4zhUkTzK8JGoOM",
  authDomain: "learning-app-748ff.firebaseapp.com",
  projectId: "learning-app-748ff",
  storageBucket: "learning-app-748ff.appspot.com",
  messagingSenderId: "834909021897",
  appId: "1:834909021897:web:852f18a9713a1655fa0f18",
  measurementId: "G-BS9XHW8GEF"
};

// Initialize Firebase
let app: FirebaseApp, auth: ReturnType<typeof getAuth>, db: Firestore, analytics: ReturnType<typeof getAnalytics> | undefined;

app = initializeApp(firebaseConfig);

// Only initialize analytics if running in a browser environment
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

auth = getAuth(app);
db = getFirestore(app);

// Sign in with custom token or anonymously
const signIn = async () => {
  try {
    // const initialAuthToken = import.meta.env.VITE_initial_auth_token;
    // if (initialAuthToken) {
    //   await signInWithCustomToken(auth, initialAuthToken);
    //   console.log("Signed in with custom token");
    // } else {
      await signInAnonymously(auth);
      console.log("Signed in anonymously");
    // }
  } catch (error) {
    console.error("Authentication failed", error);
  }
};

// Observe auth state to persist user ID
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log("User ID:", uid);
    // You can store the user ID in a context or global state here
  } else {
    console.log("User is signed out");
  }
});

export { app, auth, db as firestore, analytics, signIn };
