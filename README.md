# 💰 Sinking Fund Tracker

A modern, offline-first Progressive Web App (PWA) to help you track and manage your sinking funds for future expenses.

## ✨ Features

- **PWA Support**: Install it on your phone or desktop like a native app.
- **Offline First**: Works without an internet connection thanks to Service Workers.
- **Import/Export**: Easily sync your data across devices using JSON backups.
- **Progress Tracking**: Visual progress rings and "Monthly Goal" calculations keep you on track.
- **Auto-Update**: Built-in notification system to prompt users when a new version is available.

## 🚀 Getting Started

### Prerequisites

- **Bun** (recommended) or any local server (Node.js `serve`, Python `http.server`, etc.)

### Run Locally

1. **Clone the repository** (or navigate to the project folder).
2. **Start the server** using Bun:
   ```bash
   bunx serve .
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 PWA & Offline Support

This app uses a Service Worker (`sw.js`) to cache assets for offline use.

### 🛠️ Development vs. Production Updates

#### During Active Development (Recommended)
To see changes immediately without touching any version numbers:
1. Open Chrome DevTools (**F12**).
2. Go to the **Application** tab -> **Service Workers**.
3. Check the **"Update on reload"** box.
   - *This forces the browser to fetch the latest files on every refresh.*

#### For Deployed/Production Version
When you want to push an update to your users:
1.  **Modify the code** (`app.js`, `index.html`, etc.).
2.  **Change the CACHE_NAME** in `sw.js`:
    ```javascript
    const CACHE_NAME = 'sinking-funds-v1.0.1'; // Any unique string works!
    ```
    - *Tip: You can use v2, v1.1.0, or even a timestamp like '2024-01-06-1800'.*
3.  The next time the app is opened, a **"New version available!"** banner will appear.
4.  Click **Refresh** to apply the changes instantly.

### 🔍 Checking the Active Version
You can verify which version is currently running in your browser:
- Open DevTools -> **Application** tab.
- Expand **Cache Storage** on the left.
- You will see the version name (e.g., `sinking-funds-v1`).

### 🧹 How to Reset Everything
If the app feels "stuck" on an old version:
1. Open DevTools -> **Application** tab.
2. Click **Storage** on the left.
3. Click **Clear site data**.
4. Refresh the page.

## 📂 Data Management

### Cross-Device Sync
Since this app uses `localStorage`, your data stays on your device. To use the same data on another phone or computer:
1.  Click the **Export** (📤) button in the header.
2.  Save the `.json` file.
3.  On the second device, click **Import** (📥) and select that file.
    *(Warning: This will replace any existing data on the second device.)*

## 🛠️ Tech Stack

- **HTML5**: Semantic structure.
- **CSS3**: Custom properties (variables), Flexbox, Grid, Glassmorphism, and Animations.
- **JavaScript (ES6+)**: Functional state management and DOM manipulation.
- **Web Manifest**: App metadata for PWA installability.
- **Service Worker API**: Offline caching and background synchronization.

## 🌐 Deployment

To deploy this app, simply host the project folder as a static site. 

> [!IMPORTANT]
> **HTTPS is Required**: Service Workers and PWA "Install" prompts only work over `https://` (except for `localhost`).

Recommended platforms:
- **GitHub Pages**
- **Vercel** / **Netlify**
- **Cloudflare Pages**

## 🏗️ Configuration

### Currency Formatting
By default, the app is configured for the **Philippine Peso (PHP)** using the `en-PH` locale. To change this, update the `formatCurrency` function in `app.js`:

```javascript
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { // Change locale here
        style: 'currency',
        currency: 'USD', // Change currency code here
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
```

---

Built with Vanilla JS, CSS, and ❤️.
