# 🏠 NestFinder App

A mobile-friendly property rental marketplace — find and list rooms, 1BHK, 2BHK, 3BHK, and PG/Hostel rentals across Indian cities.

---

## 🚀 Run the App (No coding knowledge needed!)

### Step 1 — Install Docker Desktop

Docker lets you run the entire app with one command — no need to install Python, Node.js, or MongoDB separately.

👉 Download here: **https://www.docker.com/products/docker-desktop**

- **Windows**: Download and run the `.exe` installer
- **Mac**: Download and run the `.dmg` installer

Once installed, **open Docker Desktop** and wait until you see the green "Docker is running" status at the bottom.

---

### Step 2 — Download the project

Go to the GitHub repository and download the code:

👉 **https://github.com/sagarvadher3615-oss/nestfinder-app**

Click the green **"Code"** button → **"Download ZIP"** → unzip the folder on your Desktop.

---

### Step 3 — Run the app

#### On Mac:
1. Open **Terminal** (press `Cmd + Space`, type `Terminal`, press Enter)
2. Type this and press Enter:
   ```
   cd ~/Desktop/nestfinder-app
   ```
3. Then type this and press Enter:
   ```
   bash start.sh
   ```

#### On Windows:
1. Open the unzipped `nestfinder-app` folder
2. Double-click **`start.bat`**

---

### Step 4 — Open in your browser

After about 2-3 minutes (first time only), your browser will open automatically at:

👉 **http://localhost:8081**

---

## 🔑 Demo Accounts

You can log in immediately with these pre-made accounts — no sign-up needed!

| Role | Email | Password |
|------|-------|----------|
| 🏠 Tenant | tenant@nestfinder.app | Demo123! |
| 🔑 Landlord | landlord@nestfinder.app | Demo123! |

---

## 📱 Features

- 🔍 **Browse & Search** properties by city, type, price, bedrooms
- 📋 **Book** a property visit
- 💬 **Chat** with landlords/tenants
- ❤️ **Save** favourite properties
- ⭐ **Review** properties
- 🗺️ **Map view** of listings
- ✅ **KYC verification** for landlords
- 🌙 **Dark & Light** mode support

---

## 🛑 Stop the App

When you're done, open Terminal and run:

```
docker compose down
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo Web) |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| Auth | JWT (email + password) |
| Maps | OpenStreetMap (free, no API key) |

---

## 🆘 Troubleshooting

**"Docker is not running"**
→ Open Docker Desktop and wait for the whale icon to stop animating.

**App not loading after 3 minutes**
→ Run `docker compose logs frontend` to see what's happening.

**Port already in use**
→ Run `docker compose down` then `bash start.sh` again.
