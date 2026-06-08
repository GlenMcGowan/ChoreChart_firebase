# 📅 ChoreChart (Firebase Hosted Edition)

This repository contains the Firebase Hosting ready package of **ChoreChart**—the premium glassmorphism household chore scheduler and monthly calendar generator.

By using **Firebase Hosting**, you can deploy ChoreChart to a secure, global, and highly performant public CDN in seconds, letting your family members access the app on any device via a custom URL.

---

## 🚀 How to Setup & Deploy (Step-by-Step for Everyone)

Since you don't need to be a software engineer to host this app, these instructions are written to be as simple as possible. **Option A (Downloading the ZIP)** is the easiest way to get started.

### Step 1: Install Node.js on Your Personal Computer
Before getting the files, you need to install one small tool on your personal computer so it can run Firebase commands:
1. Go to **[nodejs.org](https://nodejs.org/)** and download the **LTS (Long Term Support)** version for your operating system (Mac or Windows).
2. Double-click the downloaded file and follow the standard installer prompts (click "Next" until finished).

---

### Step 2: Get the Files onto Your Personal Computer

Choose **either** Option A or Option B below to get your files:

#### Option A: The Easiest Way (No Git Setup Required)
1. Open your browser and go to your GitHub repository:
   👉 **`https://github.com/GlenMcGowan/ChoreChart_firebase`**
2. Click the green **`Code`** button at the top right of the file list.
3. Click **`Download ZIP`** from the dropdown menu.
4. Locate the downloaded `ChoreChart_firebase-main.zip` file in your Downloads folder and **extract/unzip it**.
5. Move the extracted folder (named `ChoreChart_firebase-main`) to an easy-to-find spot, like your **Desktop** or **Documents** folder.

*OR*

#### Option B: The Command Line Way (Using Git)
*Use this if you already have Git installed and set up on your personal computer:*
1. Open the Terminal (Mac) or Command Prompt/PowerShell (Windows).
2. Navigate to your desired directory (e.g., `cd Desktop`).
3. Run the clone command:
   ```bash
   git clone https://github.com/GlenMcGowan/ChoreChart_firebase.git
   ```

---

### Step 3: Open the Terminal in Your Project Folder
Now, open your command-line interface directly inside the unzipped project folder:

- **For Mac Users**: 
  1. Open the **Terminal** app.
  2. Type `cd ` (type `cd` followed by a single space).
  3. Drag and drop your unzipped `ChoreChart_firebase` folder directly from Finder into the Terminal window, then press **Enter**.
- **For Windows Users**:
  1. Open your unzipped `ChoreChart_firebase` folder in File Explorer.
  2. Click on the address bar at the very top of the window, type **`cmd`**, and press **Enter**. (This opens the Command Prompt directly in that folder!).

---

### Step 4: Install the Firebase CLI Tool
In your terminal/command prompt, run the following command to install the Firebase tools:
```bash
npm install -g firebase-tools
```
*(On Mac, if you get a permission error, run `sudo npm install -g firebase-tools` and enter your computer's password).*

---

### Step 5: Create a Project in the Firebase Console
1. Go to the **[Firebase Console](https://console.firebase.google.com/)** in your browser.
2. Sign in using your **personal Google Account** (e.g., your `@gmail.com` address).
3. Click the **"Add project"** button.
4. **Enter a Project Name** (e.g., `McGowan Chore Chart`) and click **Continue**.
5. **Google Analytics**: Toggle this **Off** (since it's a private family app, you don't need tracking) and click **Create Project**.
6. Wait a few seconds for Firebase to build your project, then click **Continue**.

---

### Step 6: Log In to Firebase CLI (Personal Account)
You need to connect your computer's terminal to your personal Google account.

> [!IMPORTANT]
> **Work vs. Personal Account Warning**: 
> Since you are on a Google corporate machine, your browser might default to your `@google.com` account. When the login page opens, **be sure to select your personal `@gmail.com` account**.
> 
> If you have previously logged in to Firebase with your work account, run:
> `firebase logout` first.

1. Run the login command:
   ```bash
   firebase login
   ```
2. A browser window will open asking you to sign in. **Select your personal Google Account** and grant the CLI permission.
3. Once successful, the terminal will print: `✔  Success! Logged in as your-personal-email@gmail.com`.

---

### Step 7: Link Your Code to Firebase and Deploy!
1. Link the local folder to your Firebase project:
   ```bash
   firebase use --add
   ```
2. Use your keyboard's arrow keys to select the Firebase project you created in Step 5, then press **Enter**.
3. When prompted: `What alias do you want to use for this project?`, type **`default`** and press **Enter**.
4. **Deploy live to the internet!** Run:
   ```bash
   firebase deploy --only hosting
   ```

Once the deployment finishes, the terminal will print your live hosting URL:
👉 **`https://<your-project-id>.web.app`**

You are officially live! Your family can now open this link on their phones, tablets, or computers and start using ChoreChart.

---

## 💻 Local Emulation & Testing
Before deploying updates in the future, you can preview the app locally using the Firebase Emulator:
```bash
firebase emulators:start --only hosting
```
Open your browser and navigate to: **[http://localhost:5000](http://localhost:5000)**

---

## 🛠️ Project Structure
```text
ChoreChart_firebase/
├── public/               # The active web directory
│   ├── index.html        # Main HTML layout
│   ├── style.css         # Glassmorphism design styling
│   └── app.js            # Core scheduling engine and UI controller
├── firebase.json         # Firebase Hosting configuration rules
├── .firebaserc           # Firebase project tracking
├── README.md             # This guide
├── run.sh                # One-click local run script for Mac/Linux
└── run.bat               # One-click local run script for Windows
```
