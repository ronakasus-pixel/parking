import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1_M9t9c8HslszvGdyhrhitC3T5-8rr3s",
  authDomain: "parking-35f27.firebaseapp.com",
  projectId: "parking-35f27",
  storageBucket: "parking-35f27.appspot.com",
  messagingSenderId: "953375205070",
  appId: "1:953375205070:web:228e58b1de22f1946cd29f",
  databaseURL: "https://parking-35f27-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// --- ניהול משתמשים (Auth) ---

// הרשמה
const registerBtn = document.getElementById("register-btn");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      alert("נרשמת בהצלחה!");
      window.location.href = "profile.html";
    } catch (error) {
      alert("שגיאת הרשמה: " + error.message);
    }
  });
}

// התחברות
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("ברוך הבא!");
      window.location.href = "profile.html";
    } catch (error) {
      alert("שגיאת התחברות: " + error.message);
    }
  });
}

// התנתקות
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("התנתקת בהצלחה!");
      window.location.href = "login.html";
    } catch (error) {
      alert("שגיאת התנתקות: " + error.message);
    }
  });
}

// ניהול נראות תפריט הניווט ודף פרופיל
onAuthStateChanged(auth, (user) => {
  const navLogin = document.getElementById("nav-login");
  const navRegister = document.getElementById("nav-register");
  const navProfile = document.getElementById("nav-profile");
  const navLogout = document.getElementById("nav-logout");

  if (user) {
    if (navLogin) navLogin.classList.add("d-none");
    if (navRegister) navRegister.classList.add("d-none");
    if (navProfile) navProfile.classList.remove("d-none");
    if (navLogout) navLogout.classList.remove("d-none");

    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    if (profileName) profileName.textContent = user.displayName || "משתמש";
    if (profileEmail) profileEmail.textContent = user.email;
  } else {
    if (navLogin) navLogin.classList.remove("d-none");
    if (navRegister) navRegister.classList.remove("d-none");
    if (navProfile) navProfile.classList.add("d-none");
    if (navLogout) navLogout.classList.add("d-none");
    if (window.location.pathname.includes("profile.html")) window.location.href = "login.html";
  }
});

// --- עדכונים בזמן אמת (Real-time Updates) ---

// 1. האזנה לסטטוס החניות
const alteraRef = ref(database, 'fromAltera/C');
onValue(alteraRef, (snapshot) => {
  const totalStatus = snapshot.val() || 0;
  for (let i = 1; i <= 6; i++) {
    const div = document.getElementById(`status-spot-${i}`);
    if (!div) continue;
    const isOccupied = (totalStatus & (1 << (i - 1))) !== 0;
    if (isOccupied) {
      div.innerText = 'תפוס';
      div.className = "p-3 mb-3 text-white rounded bg-danger fw-bold";
    } else {
      div.innerText = 'פנוי';
      div.className = "p-3 mb-3 text-white rounded bg-success fw-bold";
    }
  }
});

// --- לוגיקת שער משולבת (חיישן + כפתור) ---
const gateStatusDiv = document.getElementById("status-gate");
const gateUpBtn = document.getElementById("gate-up-btn");

if (gateStatusDiv) {
  const toAlteraRef = ref(database, 'toAltera');
  const distanceRef = ref(database, 'fromAltera/A');

  const updateGateUI = (isGateForcedOpen, distance) => {
    const isClose = distance < 20 && distance > 0;
    if (isGateForcedOpen === 1 || isClose) {
      let message = "שער פתוח";
      if (isClose && isGateForcedOpen !== 1) message += " - רכב מזוהה";
      if (isGateForcedOpen === 1 && !isClose) message += " - פתיחה ידנית";
      gateStatusDiv.textContent = message;
      gateStatusDiv.className = "p-3 mb-3 text-white rounded bg-warning fw-bold";
    } else {
      gateStatusDiv.textContent = "שער סגור";
      gateStatusDiv.className = "p-3 mb-3 text-white rounded bg-secondary fw-bold";
    }
  };

  let lastGateValue = 0;
  let lastDistanceValue = 100;

  onValue(toAlteraRef, (snapshot) => {
    lastGateValue = snapshot.val() || 0;
    updateGateUI(lastGateValue, lastDistanceValue);
  });

  onValue(distanceRef, (snapshot) => {
    lastDistanceValue = snapshot.val() || 0;
    updateGateUI(lastGateValue, lastDistanceValue);
  });

  if (gateUpBtn) {
    gateUpBtn.addEventListener("click", () => {
      set(toAlteraRef, 1)
        .then(() => {
          console.log("Gate forced open via button.");
          setTimeout(() => {
            set(toAlteraRef, 0)
              .then(() => console.log("Manual open period ended."))
              .catch((err) => console.error("Auto-close error:", err));
          }, 10000); 
        })
        .catch((error) => alert("שגיאה בהפעלת השער: " + error.message));
    });
  }
}

// 4. עדכון סטטוס תאורה
const lightStatusDiv = document.getElementById("status-light");
if (lightStatusDiv) {
  const lightRef = ref(database, "parking/light");
  onValue(lightRef, (snapshot) => {
    const status = snapshot.val();
    if (status === 1) {
      lightStatusDiv.textContent = "תאורה דולקת";
      lightStatusDiv.className = "p-3 mb-3 text-white rounded bg-warning fw-bold";
    } else {
      lightStatusDiv.textContent = "תאורה כבויה";
      lightStatusDiv.className = "p-3 mb-3 text-white rounded bg-dark fw-bold";
    }
  });
}

// 5. עדכון חיישן מרחק
const distanceStatusDiv = document.getElementById("distance-status");
const distanceValueDiv = document.getElementById("distance-value");

if (distanceStatusDiv) {
  const distanceRef = ref(database, 'fromAltera/A');
  onValue(distanceRef, (snapshot) => {
    const distance = snapshot.val() || 0;
    if (distanceValueDiv) distanceValueDiv.textContent = `מרחק: ${distance} ס"מ`;
    if (distance < 20) {
      distanceStatusDiv.innerText = 'יש מישהו מול השער';
      distanceStatusDiv.className = "p-3 mb-2 text-white rounded bg-danger fw-bold";
    } else {
      distanceStatusDiv.innerText = 'אין אף אחד מול השער';
      distanceStatusDiv.className = "p-3 mb-2 text-white rounded bg-success fw-bold";
    }
  });
}