      (async function _bootstrapFirebase() {
      let FIREBASE_CONFIG = {};
      try {
        const _cfgRes = await fetch('/api/config');
        FIREBASE_CONFIG = (await _cfgRes.json()).firebase || {};
        if (!FIREBASE_CONFIG.apiKey) throw new Error('Firebase config eksik');
      } catch(e) {
        console.warn('[Firebase] Config yüklenemedi, Firebase devre dışı:', e.message);
        window._fbReady = false;
        window.dispatchEvent(new Event('firebase-ready'));
        return;
      }

      const GAME_ID       = "understate_main_server";
      const REALTIME_KEYS = ["globalChat","cityChats","parliamentMsgs","supportMsgs","liveNews","announcements","activityFeed"];
      const LOG_KEYS      = ["casinoLogs","activityLog","historyLog","liveFeed","socialPosts","newspapers","randomEvents","scandals","netWorthHistory"];

      firebase.initializeApp(FIREBASE_CONFIG);
      const _db   = firebase.firestore();
      const _rtdb = firebase.database();
      const _auth = firebase.auth();

      window._gameId  = GAME_ID;
      window._rtKeys  = REALTIME_KEYS;
      window._logKeys = LOG_KEYS;
      window._fbReady = false;

      window._fb = {
        db:              _db,
        rtdb:            _rtdb,
        setDoc:          (ref, data, opts) => opts && opts.merge ? ref.set(data, {merge:true}) : ref.set(data),
        getDoc:          (ref) => ref.get(),
        doc: (db, ...path) => {
          let ref = db;
          for (let i = 0; i < path.length; i++) {
            ref = (i % 2 === 0) ? ref.collection(path[i]) : ref.doc(path[i]);
          }
          return ref;
        },
        onSnapshot:      (ref, cb) => ref.onSnapshot(cb),
        serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
        rtdbRef:         (path) => _rtdb.ref(path),
        rtdbUpdate:      (path, data) => _rtdb.ref(path).update(data),
        rtdbServerTime:  () => firebase.database.ServerValue.TIMESTAMP
      };

      // RTDB {"0":a,"1":b} → JS array dönüşümü
      function rtdbToJS(val) {
        if (val === null || val === undefined) return val;
        if (typeof val !== 'object' || Array.isArray(val)) {
          return Array.isArray(val) ? val.map(rtdbToJS) : val;
        }
        const keys = Object.keys(val);
        if (keys.length === 0) return val;
        const allNumeric = keys.every(k => /^\d+$/.test(k));
        if (allNumeric) {
          const maxIdx = Math.max(...keys.map(Number));
          if (maxIdx === keys.length - 1) {
            return keys.sort((a,b) => Number(a)-Number(b)).map(k => rtdbToJS(val[k]));
          }
        }
        const out = {};
        keys.forEach(k => { out[k] = rtdbToJS(val[k]); });
        return out;
      }

      // ─── TEK dinleyici: SADECE RTDB ───
      function setupRTDBListener() {
        const rtdbRef = _rtdb.ref("games/" + GAME_ID + "/realtime");
        rtdbRef.on("value",
          (snap) => {
            if (!snap.exists()) return;
            const raw = snap.val();
            Object.entries(raw).forEach(([k, rawVal]) => {
              if (!REALTIME_KEYS.includes(k)) return;
              try {
                const v        = rtdbToJS(rawVal);
                const currStr  = localStorage.getItem("rep_" + k);
                const incoming = JSON.stringify(v);
                if (currStr === incoming) return; // Değişmemiş

                // DÖNGÜ ÖNLEMESİ: Gelen array mevcut olandan kısaysa reddet.
                // İki farklı istemci birbiriyle çelişince mesajlar 18↔19
                // arasında gidip geliyordu. Chat sadece büyüyebilir.
                if (Array.isArray(v) && currStr) {
                  try {
                    const currArr = JSON.parse(currStr);
                    if (Array.isArray(currArr) && v.length < currArr.length) return;
                  } catch(e) {}
                }

                localStorage.setItem("rep_" + k, incoming);
                window.dispatchEvent(new CustomEvent("fb-sync", { detail: { key: k, value: v } }));
              } catch(e) {}
            });
          },
          (err) => {
            console.warn("[RTDB] Bağlantı hatası:", err.code, "→ Firestore'a geçiliyor");
            setupFirestoreFallback();
          }
        );
        console.log("[RTDB] Dinleyici aktif ✓");
      }

      // Yalnızca RTDB tamamen başarısız olursa devreye girer
      function setupFirestoreFallback() {
        const rtRef = _db.collection("games").doc(GAME_ID).collection("realtime").doc("shared");
        rtRef.onSnapshot(
          (snap) => {
            if (!snap.exists) return;
            Object.entries(snap.data()).forEach(([k, v]) => {
              if (!REALTIME_KEYS.includes(k)) return;
              try {
                const curr = localStorage.getItem("rep_" + k);
                const inc  = JSON.stringify(v);
                if (curr !== inc) {
                  localStorage.setItem("rep_" + k, inc);
                  window.dispatchEvent(new CustomEvent("fb-sync", { detail: { key: k, value: v } }));
                }
              } catch(e) {}
            });
          },
          (err) => console.warn("[Firestore] Fallback da başarısız:", err.message)
        );
        console.log("[Firestore] Fallback aktif ✓");
      }

      // Başlangıçta tek seferlik: Firestore'dan mevcut mesaj geçmişini al
      // (RTDB henüz boşsa Firestore'daki eski mesajlar gösterilsin)
      async function loadRealtimeOnce() {
        try {
          // Önce RTDB'yi dene
          const rtSnap = await _rtdb.ref("games/" + GAME_ID + "/realtime").get();
          if (rtSnap.exists()) {
            const raw = rtSnap.val();
            Object.entries(raw).forEach(([k, rawVal]) => {
              if (!REALTIME_KEYS.includes(k)) return;
              try {
                const v = rtdbToJS(rawVal);
                localStorage.setItem("rep_" + k, JSON.stringify(v));
              } catch(e) {}
            });
            console.log("[RTDB] Mevcut mesajlar yüklendi ✓");
            return; // RTDB'den yüklendiyse Firestore'a gerek yok
          }
          // RTDB boşsa Firestore'dan al (tek seferlik, dinleyici değil)
          const fsSnap = await _db
            .collection("games").doc(GAME_ID)
            .collection("realtime").doc("shared").get();
          if (fsSnap.exists) {
            Object.entries(fsSnap.data()).forEach(([k, v]) => {
              if (!REALTIME_KEYS.includes(k)) return;
              try { localStorage.setItem("rep_" + k, JSON.stringify(v)); } catch(e) {}
            });
            console.log("[Firestore] Geçmiş mesajlar yüklendi ✓");
          }
        } catch(e) {
          console.warn("[Realtime] İlk yükleme hatası:", e.message);
        }
      }

      async function loadGameState() {
        try {
          const snap = await _db
            .collection("games").doc(GAME_ID)
            .collection("state").doc("main").get();
          if (snap.exists) {
            const data = snap.data();
            Object.entries(data).forEach(([k, v]) => {
              if (k === "_meta") return;
              try { localStorage.setItem("rep_" + k, JSON.stringify(v)); } catch(e) {}
            });
            console.log("[Firestore] State yüklendi:", Object.keys(data).length, "anahtar");
          }
        } catch(e) {
          console.warn("[Firestore] State yüklenemedi:", e.message);
        }
      }

      async function initFirebaseData() {
        window._fbUid = "webview_" + Math.random().toString(36).substr(2, 9);
        console.log("[Firebase] Başlatılıyor...");

        // Sadece RTDB dinleniyor (Firestore onSnapshot YOK — döngü önleme)
        setupRTDBListener();

        await Promise.allSettled([
          loadGameState(),
          loadRealtimeOnce()
        ]);

        window._fbReady = true;
        window.dispatchEvent(new Event("firebase-ready"));
        console.log("[Firebase] Hazır ✓");
      }

        initFirebaseData();
      })(); // async bootstrap