# 📅 ChoreChart (Firebase Hosted Edition)

This repository contains the Firebase Hosting ready package of **ChoreChart**—the premium glassmorphism household chore scheduler and monthly calendar generator.

By using **Firebase Hosting**, you can deploy ChoreChart to a secure, global, and highly performant public CDN in seconds, letting your family members access the app on any device via a custom URL.

---

## 📂 Repository Structure
```text
ChoreChart_firebase/
├── public/               # The active web directory
│   ├── index.html        # Main HTML layout
│   ├── style.css         # Glassmorphism design styling
│   └── app.js            # Core scheduling engine and UI controller
├── firebase.json         # Firebase Hosting configuration rules
├── .firebaserc           # Firebase project tracking
└── README.md             # This guide
```

---

## 🚀 Step-by-Step Firebase Hosting Deployment

### 1. Prerequisites
Ensure you have **Node.js** and **npm** installed on your local development machine (needed to run the Firebase CLI commands).

### 2. Install the Firebase CLI
Install the command-line interface globally:
```bash
npm install -g firebase-tools
```

### 3. Log In to Firebase
Log in using the Google account associated with your Firebase Console:
```bash
firebase login
```

### 4. Create a Firebase Project (If you don't have one)
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and create a project named `ChoreChart` (e.g. `chorechart-12345`).

### 5. Link the Local Folder to Your Project
Associate this codebase with your Firebase project:
```bash
firebase use --add
```
*It will prompt you to select your Firebase project from a list. Give it an alias (e.g. `default`).*

---

## 💻 Local Emulation & Testing
Before deploying, you can test the app locally using the Firebase Emulator:
```bash
firebase emulators:start --only hosting
```
Open your browser and navigate to: **[http://localhost:5000](http://localhost:5000)**

---

## 🌐 Deploy to Production (Live on the Web!)
To publish your ChoreChart live on the internet, simply run:
```bash
firebase deploy --only hosting
```

Once the deployment finishes, Firebase CLI will print your live hosting URL, which will look like:
👉 **`https://<your-firebase-project-id>.web.app`**

Your family can now access the ChoreChart securely from their phones, tablets, or computers!
