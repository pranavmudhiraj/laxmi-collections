/***************************************
  Laxmi Collections - script.js
  Put your Firebase config in the firebaseConfig object below.
***************************************/

/* ------------------- Firebase SDK (compat) -------------------
   Note: pages already include compat SDKs per earlier steps.
   If you didn't include them in every HTML page, add these:
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
----------------------------------------------------------------*/

///////////////////////////
// 1) Firebase init
///////////////////////////

const firebaseConfig = {
  // <<< PASTE YOUR FIREBASE CONFIG OBJECT HERE >>>
  // Example:
  // apiKey: "AIza....",
  // authDomain: "yourproj.firebaseapp.com",
  // projectId: "yourproj",
  // storageBucket: "yourproj.appspot.com",
  // messagingSenderId: "12345",
  // appId: "1:123:web:abc"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

///////////////////////////
// 2) Admin settings
///////////////////////////

// Admin email (you told me this earlier)
const ADMIN_EMAIL = "nanipranav26@gmail.com";
// Admin password you created in Firebase console: Pranav@123
// (Do NOT put a password check here — we rely on Firebase Auth.)

///////////////////////////
// 3) Registration & Login
///////////////////////////

// Called from register.html
function registerUser() {
  const name = (document.getElementById("name") || {}).value || "";
  const email = (document.getElementById("email") || {}).value || "";
  const pass = (document.getElementById("password") || {}).value || "";

  if (!name || !email || !pass) {
    alert("Please fill all fields.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      const user = userCredential.user;
      // Save extra profile to Firestore
      db.collection("users").doc(user.uid).set({
        name: name,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Admin alert
      db.collection("adminAlerts").add({
        name: name,
        email: email,
        time: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert("Registered successfully! Please login.");
      window.location.href = "login.html";
    })
    .catch(error => {
      alert(error.message);
    });
}

// Called from login.html
function loginUser() {
  const email = (document.getElementById("loginEmail") || {}).value || "";
  const pass  = (document.getElementById("loginPass") || {}).value || "";

  if (!email || !pass) {
    alert("Please fill email and password.");
    return;
  }

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      // Redirect based on admin vs normal user
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "index.html";
      }
    })
    .catch(error => {
      alert(error.message);
    });
}

///////////////////////////
// 4) Add to Cart functions
///////////////////////////

// Add product to user's cart (products have 'id', 'name', 'price')
function addToCart(productId, productName, price) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login to add items to cart.");
    window.location.href = "login.html";
    return;
  }

  const itemRef = db.collection("carts").doc(user.uid).collection("items").doc(productId);
  itemRef.get()
    .then(doc => {
      if (doc.exists) {
        // If already in cart, increment quantity
        const qty = (doc.data().quantity || 1) + 1;
        return itemRef.update({ quantity: qty });
      } else {
        return itemRef.set({
          id: productId,
          name: productName,
          price: Number(price) || 0,
          quantity: 1
        });
      }
    })
    .then(() => {
      alert(productName + " added to cart.");
    })
    .catch(err => {
      alert("Error adding to cart: " + err.message);
    });
}

// Load cart content into element with id="cartItems" (cart.html)
function loadCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;
  const user = auth.currentUser;
  if (!user) {
    container.innerHTML = `<p>Please <a href="login.html">login</a> to view your cart.</p>`;
    return;
  }

  db.collection("carts").doc(user.uid).collection("items")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        return;
      }
      let html = "";
      let total = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        const subtotal = (d.price || 0) * (d.quantity || 1);
        total += subtotal;
        html += `
          <div class="cart-row">
            <strong>${d.name}</strong><br>
            ₹${d.price} × ${d.quantity} = ₹${subtotal}
            <div style="margin-top:6px;">
              <button onclick="changeQuantity('${d.id}', -1)">-</button>
              <button onclick="changeQuantity('${d.id}', 1)">+</button>
              <button onclick="removeFromCart('${d.id}')">Remove</button>
            </div>
          </div>
          <hr>
        `;
      });
      html += `<h3>Total: ₹${total}</h3>`;
      container.innerHTML = html;
    })
    .catch(err => container.innerHTML = "Error loading cart: " + err.message);
}

function changeQuantity(productId, delta) {
  const user = auth.currentUser;
  if (!user) { alert("Login required"); return; }
  const ref = db.collection("carts").doc(user.uid).collection("items").doc(productId);
  ref.get().then(doc => {
    if (!doc.exists) return;
    let q = (doc.data().quantity || 1) + delta;
    if (q <= 0) {
      ref.delete().then(() => loadCart());
    } else {
      ref.update({ quantity: q }).then(() => loadCart());
    }
  });
}

function removeFromCart(productId) {
  const user = auth.currentUser;
  if (!user) { alert("Login required"); return; }
  db.collection("carts").doc(user.uid).collection("items").doc(productId)
    .delete()
    .then(() => loadCart());
}

///////////////////////////
// 5) Load products on products.html
///////////////////////////

function loadProducts() {
  const productList = document.getElementById("productList");
  if (!productList) return;
  productList.innerHTML = "Loading products...";
  db.collection("products").get()
    .then(snapshot => {
      if (snapshot.empty) {
        productList.innerHTML = "<p>No products found.</p>";
        return;
      }
      productList.innerHTML = "";
      snapshot.forEach(doc => {
        const p = doc.data();
        const card = document.createElement("div");
        card.className = "product-card";
        card.style = "margin:8px; padding:10px; background:#1c1c1c; border-radius:8px;";
        card.innerHTML = `
          <img src="${p.image || 'assets/prod1.png'}" alt="${p.name}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;">
          <p style="margin:8px 0 4px 0;"><strong>${p.name}</strong></p>
          <p style="margin:2px 0;">₹${p.price}</p>
          <button onclick="addToCart('${p.id}','${p.name}',${p.price})">Add to Cart</button>
        `;
        productList.appendChild(card);
      });
    })
    .catch(err => productList.innerHTML = "Error loading products: " + err.message);
}

///////////////////////////
// 6) Admin dashboard protection & functions
///////////////////////////

// Call this on admin-dashboard.html to protect the page and load admin data.
function adminProtectAndLoad() {
  auth.onAuthStateChanged(user => {
    if (!user) {
      // Not logged in — redirect to admin login
      window.location.href = "admin.html";
      return;
    }
    // verify email matches admin
    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Load admin widgets
      loadAdminAlerts();
      loadAdminProducts();
    } else {
      // Not admin — redirect to home
      alert("Access denied: Admins only.");
      window.location.href = "index.html";
    }
  });
}

function adminLogin() {
  // from admin.html
  const email = (document.querySelector("#adminEmail") || {}).value || "";
  const pass  = (document.querySelector("#adminPass") || {}).value || "";

  if (!email || !pass) { alert("Fill fields"); return; }

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        window.location.href = "admin-dashboard.html";
      } else {
        alert("Not the admin account.");
        auth.signOut();
      }
    })
    .catch(err => alert(err.message));
}

function loadAdminAlerts() {
  const el = document.getElementById("userAlerts");
  if (!el) return;
  db.collection("adminAlerts").orderBy("time", "desc").limit(50).get()
    .then(snapshot => {
      if (snapshot.empty) { el.innerHTML = "<p>No alerts</p>"; return; }
      let html = "<h3>New Registrations</h3>";
      snapshot.forEach(doc => {
        const d = doc.data();
        const t = d.time && d.time.toDate ? d.time.toDate().toLocaleString() : "";
        html += `<div style="padding:6px;border-bottom:1px solid #222;"><strong>${d.name}</strong> — ${d.email}<br><small>${t}</small></div>`;
      });
      el.innerHTML = html;
    });
}

function loadAdminProducts() {
  const el = document.getElementById("allProducts");
  if (!el) return;
  db.collection("products").get()
    .then(snapshot => {
      if (snapshot.empty) { el.innerHTML = "<p>No products</p>"; return; }
      let html = "<h3>Products</h3>";
      snapshot.forEach(doc => {
        const p = doc.data();
        html += `<div style="padding:6px;border-bottom:1px solid #222;">
          <strong>${p.name}</strong> — ₹${p.price} <button onclick="deleteProduct('${doc.id}')">Delete</button>
        </div>`;
      });
      el.innerHTML = html;
    });
}

function deleteProduct(docId) {
  if (!confirm("Delete product?")) return;
  db.collection("products").doc(docId).delete()
    .then(() => {
      alert("Deleted");
      loadAdminProducts();
    })
    .catch(err => alert("Error: " + err.message));
}

///////////////////////////
// 7) Utilities
///////////////////////////

function signOut() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

/* Auto-run helpers when pages load:
 - products.html should call loadProducts()
 - cart.html should call loadCart() after including this script
 - admin-dashboard.html should call adminProtectAndLoad()
 - admin.html login button should call adminLogin()
 - register.html should call registerUser() via onclick
 - login.html should call loginUser() via onclick
*/
// Add product to cart
function addToCart(productId, productName, price) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login first!");
        return;
    }
    db.collection("carts").doc(user.uid).collection("items").doc(productId).set({
        name: productName,
        price: price,
        quantity: 1
    })
    .then(() => alert(productName + " added to cart"))
    .catch(err => alert(err.message));
}

// Load cart items on cart page
function loadCart() {
    const user = auth.currentUser;
    if (!user) {
        document.getElementById("cartItems").innerHTML = "Login to view cart";
        return;
    }
    db.collection("carts").doc(user.uid).collection("items")
    .get()
    .then(snapshot => {
        let html = "";
        snapshot.forEach(doc => {
            let data = doc.data();
            html += `<div>${data.name} - ₹${data.price} x ${data.quantity}</div>`;
        });
        document.getElementById("cartItems").innerHTML = html;
    });
}
function loginUser() {
    let email = document.getElementById("loginEmail").value;
    let pass = document.getElementById("loginPass").value;

    auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        alert("Login successful!");
        window.location.href = "index.html";
    })
    .catch((error) => {
        alert(error.message);
    });
}
function registerUser() {
    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let pass = document.getElementById("password").value;

    if (name == "" || email == "" || pass == "") {
        alert("Fill all fields");
        return;
    }

    // Create user in Firebase Auth
    auth.createUserWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        const user = userCredential.user;
        // Save user info in Firestore
        db.collection("users").doc(user.uid).set({
            name: name,
            email: email,
            createdAt: new Date()
        });
        alert("Registered successfully!");
        window.location.href = "login.html";

        // Send admin alert
        db.collection("adminAlerts").add({
            email: email,
            name: name,
            time: new Date()
        });
    })
    .catch((error) => {
        alert(error.message);
    });
}
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFXoth40tGQb2RKuU6uHWpNFShS2pSbdc",
  authDomain: "laxmi-collections26.firebaseapp.com",
  projectId: "laxmi-collections26",
  storageBucket: "laxmi-collections26.firebasestorage.app",
  messagingSenderId: "688750097818",
  appId: "1:688750097818:web:14425e9e055522fb3b3623",
  measurementId: "G-0X6NPTNQLP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);// ===== User Registration =====
function registerUser() {
    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let pass = document.getElementById("password").value;

    if (name == "" || email == "" || pass == "") {
        alert("Fill all fields");
        return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];
    users.push({ name, email, pass });
    localStorage.setItem("users", JSON.stringify(users));

    alert("Registered successfully!");
    window.location.href = "login.html";
}

// ===== User Login =====
function loginUser() {
    let email = document.getElementById("loginEmail").value;
    let pass = document.getElementById("loginPass").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    let found = users.find(u => u.email == email && u.pass == pass);

    if (found) {
        localStorage.setItem("loggedInUser", email);
        window.location.href = "index.html";
    } else {
        alert("Invalid details!");
    }
}
