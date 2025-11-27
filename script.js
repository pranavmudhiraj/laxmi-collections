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
