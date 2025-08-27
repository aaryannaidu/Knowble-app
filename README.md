# Welcome to your Expo app 👋

## 🚀 Knowble-app Installation & Setup

### Prerequisites
- **Node.js** (v16 or newer recommended)
- **npm** (v8 or newer recommended)
- **Expo CLI** (install globally with `npm install -g expo-cli`)

### Installation Steps
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Knowble-app
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the app**
   ```bash
   npx expo start
   ```
   This will open the Expo Dev Tools in your browser. You can run the app on an emulator, simulator, or your physical device using the QR code.

---

## 🛠️ Project Workflow
- The app uses **file-based routing** (see the `app/` directory).
- Main screens and features are organized into folders:
  - `(auth)`: Authentication (login, register, etc.)
  - `(drawer)`: Drawer navigation (profile, settings, saved, etc.)
  - `(tabs)`: Tab navigation (home, categories, search, subscriptions, etc.)
  - `components/`: Reusable UI components (e.g., `VideoCard`, `NotificationProvider`)
- To add a new screen, create a new file or folder in the appropriate section of `app/`.
- For shared logic or UI, add to `components/`.
- **Development:**
  - Make a new branch for your feature or fix.
  - Commit your changes with clear messages.
  - Open a Pull Request (PR) for review.
  - Follow code style and naming conventions.

---

## 🧩 Component & Folder Overview
- **app/(auth)**: Authentication screens and logic
- **app/(drawer)**: Drawer navigation and related screens (profile, settings, etc.)
- **app/(tabs)**: Main tabbed navigation (home, categories, search, etc.)
- **app/components/**: Shared React components (cards, providers, etc.)
- **app/categories/**: Category-specific screens
- **app/channels/**: Channel-specific screens
- **app/comments/**: Video comments screens
- **app/microcourses/**: Microcourse-specific screens
- **app/watch/**: Video watching screens
- **app/config.ts**: App configuration

---

## 🤝 Contributing
1. **Fork** the repository on GitHub.
2. **Clone** your fork locally.
3. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "Add: your message here"
   ```
5. **Push** to your fork and **open a Pull Request**.
6. Wait for review and merge!

---

## 📚 Learn More
- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
- [Expo on GitHub](https://github.com/expo/expo)
- [Discord community](https://chat.expo.dev)

---
