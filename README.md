# 🌀 Polarized
*A minimal social feed built with React + Firebase.*

> Screenshot from v1.0-beta  
> ![Polarized Screenshot](https://github.com/user-attachments/assets/b259b306-75d2-46b0-9bda-eb49698341d3)

---

## 🚀 Overview
**Polarized** is a lightweight social app where users can share image posts, like content, and manage their profiles — powered by Firebase.  
Built with **Vite**, **React**, and **Firebase (Auth, Firestore, Storage)** for speed and simplicity.

---

## Updates

Further updates and changelogs can be found in the [changelog.md](changelog.md) file.

- v2.0-beta
  - Added: Post comments
  - Added: Individual post view page
  - Added: Relative time (time ago format)
  - Added: Turkish and Azerbaijani language support (i18n)
  - Added: Double-tap to like posts
  - Improved: UI polish and responsiveness
  - Improved: Post grid performance
  - Improved: Like button UX
  - Removed: Real-time post and comment updates (switched to on-demand fetch)
  - Fixed: Image stretching on first paint due to aspect-ratio property
  - Fixed: N+1 problem when fetching posts
  - Bug fixes & optimizations

- v1.2-beta
  - Added: Following/followers system
  - Improved: Form validation
  - Bug fixes & optimizations

- v1.1-beta
  - Added: Profile photo change support
  - Added: Website favicon
  - Bug fixes & optimizations

- v1.0-beta
  - Initial release

## ✨ Features

### 🔐 Authentication
- Email/password sign-up + login  
- Google sign-in
- Email verification 
- Username availability check
- Form validation

### 🖼️ Posts
- Create posts with **image + caption** 
- Image compression before upload
- Uploads stored in Firebase Storage
- Live, responsive grid feed
- User-specific posts
- Like/unlike posts (with optimistic UI updates)
- Comments on posts (v2.0-beta)

### 👤 User Profiles
- View and edit profile information
- Display user’s posts and activity
- Follow/unfollow other users

### 💎 UX
- Smooth **skeleton loaders** for profile and post grids  
- Responsive design for desktop & mobile  
- Optimistic UI updates for likes and follows

---

## 🧰 Tech Stack
- **Frontend:** React + React Router + Vite  
- **Backend:** Firebase v9 (Auth, Firestore, Storage)

---

## Quick start
1) Install dependencies
```powershell
npm install
```

2) Create environment variables (already added if you used the in-editor action).
Create a file named `.env` in the project root with your Firebase client config:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
Note: `.env` is already in `.gitignore`.

3) Run the dev server
```powershell
npm run dev
```
Open the printed local URL in your browser.

## Firebase setup
- Auth providers:
  - Email/Password: enabled
  - Google: enabled (optional)
- Firestore: start in test mode during development
- Storage: start in test mode during development

Suggested minimal development rules (tighten for production):
```jsonc
// Firestore (Rules snippets – adapt for production)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.resource.data.authorUid == request.auth.uid;

      match /likes/{uid} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```
```jsonc
// Storage (Rules snippets – adapt for production)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{uid}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Project structure (selected)
- `src/App.jsx` – routes, auth state wiring
- `src/firebase.js` – initializes Firebase using `.env` (VITE_ vars)
- `src/components/`
  - `Login.jsx`, `SignUp.jsx` – auth screens (email verification handled)
  - `Header.jsx` – app header
  - `Profile.jsx` – profile card, edit name, logout, user-specific feed
  - `CreatePost.jsx` – image upload + caption (client compression)
  - `PostsFeed.jsx` – responsive grid feed with likes and skeletons
- `src/utils/image.js` – Canvas compression helper
- `src/utils/firebaseErrors.js` – maps common Auth errors to friendly text
- `src/style.css` and `src/styles/*.css` – global + component styles

## How posts are stored
Collection: `posts`
```json
{
  "postedAt": <serverTimestamp>,
  "imageUrl": "https://...",
  "caption": "string (<= 100 chars)",
  "author": "username",
  "authorUid": "uid",
  "authorPp": "photoURL",
  "likeCount": 0
}
```
Per-user likes:
- Subcollection: `posts/{postId}/likes/{uid}` with `{ uid, createdAt }` (for idempotency)

## Notes & troubleshooting
- Email verification: Email/password users must verify before they can continue; unverified sessions are treated as logged out.
- Profile feed: We support legacy posts without `authorUid` by also filtering by `author` (username) when viewing profiles.
- Grid images: We reserve space with a 3:4 wrapper and `object-fit: contain` to avoid layout shift and cropping.
- Env changes: If you change `.env`, restart the dev server for Vite to pick them up.

## Scripts
```powershell
npm run dev     # Start dev server
npm run build   # Production build
npm run preview # Preview production build locally
```

## License
MIT (add your preferred license if different)