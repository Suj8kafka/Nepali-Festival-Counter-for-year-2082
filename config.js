   // For Firebase JS SDK v7.20.0 and later, measurementId is optional
            const firebaseConfig = {
                            apiKey: "AIzaSyDHe5M87mhjd51czW1wbrdb_HSDP2g-bXE",
                            authDomain: "website-visit-counter-f256f.firebaseapp.com",
                            projectId: "website-visit-counter-f256f",
                            storageBucket: "website-visit-counter-f256f.firebasestorage.app",
                            messagingSenderId: "1079159075631",
                            appId: "1:1079159075631:web:db618ab0b83af3a809e7da",
                            measurementId: "G-093QF1PMS6"
                            };

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const visitDoc = db.collection("siteData").doc("visitCount");

    // Count only once per session
    const isNewSession = !sessionStorage.getItem("sessionVisited");

    if (isNewSession) {
      sessionStorage.setItem("sessionVisited", "true");

      // Safe increment
      visitDoc.set({
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true }).catch((error) => {
        console.error("Error updating visit count:", error);
      });
    }

    // Display visit count
    visitDoc.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        document.getElementById("totalVisits").innerText = data.count || 0;
      } else {
        document.getElementById("totalVisits").innerText = "0";
      }
    });