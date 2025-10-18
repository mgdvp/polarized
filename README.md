# Polaryzed

A minimal social feed built with Vite + React + Firebase (Auth, Firestore, Storage). Users can sign up/login, verify email, edit their profile name, create image posts (auto-compressed), browse a responsive grid feed, and like posts. Skeletons provide a smooth loading UX.

## Features
### v1.0-beta
- Auth
  - Email/password sign up with email verification and username availability check
  - Google sign-in
  - Unverified email sessions are blocked until verification
  - Edit display name, logout from profile
- Posts
  - Create post with image + caption (caption limited to 100 chars on client)
  - Client-side image compression (Canvas), uploaded to Firebase Storage
  - Posts stored in Firestore under `posts`
  - Live recent feed (grid, responsive)
  - Profile page shows only that user’s posts
  - 3:4 image tiles with letterboxing (no crop) to keep grid uniform
  - Likes with per-user toggle using subcollection `posts/{postId}/likes/{uid}` and atomic counters
- UX
  - Skeleton loaders for profile header and posts grid
  - Modern dark theme, full-width auth inputs/buttons, improved link color

## Tech stack
- Vite 7
- React + react-router-dom
- Firebase v9+ (modular): Auth, Firestore, Storage

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
