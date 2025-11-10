## Changelog

### v2.5.1-beta (2025-11-10)
- Fixed: Avatar image onError listener makes infinite requests to server

### v2.5.0-beta (2025-11-03)
- Chat Improvements:
    - Added: Infinite scroll for older chat messages (loads 50 more on scroll-to-top)
    - Changed: New message streaming switched to `onChildAdded` after initial batch
    - Improved: Date/time formatting performance by moving helpers outside the render loop
    - Fixed: Height issue on chat screen on small screens (using dvh) (beta!)
    - MessageBubble is now independent component and memoized
- Added: Ionic icon implementation for entire app (replacing emoji buttons)
- Added: Instant post data passing (thanks to React Router ```state```.)
- Added: 404 Not Found page with translation support
- Added: Create post button on header for easy access and navigation
- Changed: Profile photo in header instead of username
- Fixed: Millisecond login flash bug even user logged in (loading state handling)
- UI & UX improvements

### v2.4.0-beta (2025-11-02)
- Added: Chat date separator with "Today" and "Yesterday" labels (1-hour gap threshold)
- Added: Message timestamp shown on hover
- Removed: Automatic chat selection on wide screens
- Fixed: Text ellipsis issue in chat list message preview
- Fixed: Long words breaking chat message bubbles on small screens

### v2.3.0 (2025-11-01)
- Added: Typing indicator in chat view
- Added: Button to route home on mobile screens when in chat view
- Added: Profile photo in user's first message after other user's message
- Removed: Chat input send button visibility on mobile
- Performance optimizations
- UI & UX improvements

### v2.2.2 (2025-10-29)
- Fixed: Chat input focus issue on mobile (keyboard closing after sending message)
- Improved: Security rules for chat messages
- UI & UX improvements
- Minor bug fixes & optimizations

### v2.2.1 (2025-10-28)
- Improved: Code refactoring over chat components
- Fixed: Like/comment functionality not working due to firebase rules misconfiguration

### v2.2.0 (2025-10-28)
- Added: Chat feature (one-on-one messaging) (with RTDB)
- Improved: Optimized message rendering and scroll handling on mobile.
- Improved: Chat UI and responsiveness
- Fixed: Various minor bugs
- UI & UX improvements

### v2.1.0 (2025-10-25)
- Added: Translation completed
- Improved: Image compression quality (from 0.8 to 0.85, jpeg to webp)
- Improved: Form validation
- Fixed: Follow button visible when not logged in
- Fixed: Profile page not scrolling to top on navigation
- UI & UX improvements

### v2.0 (2025-10-23)
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

### v1.2 (2025-10-22)
- Added: Following/followers system
- Improved: Form validation
- Bug fixes & optimizations

### v1.1 (2025-10-22)
- Added: Profile photo change support
- Added: Website favicon
- Bug fixes & optimizations

### v1.0 (2025-10-18)

- Initial release
