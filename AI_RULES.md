# AI Development Rules - Stem Player & Mixer

## 🛠 Tech Stack
*   **Framework:** React 18 with TypeScript for type-safe component logic.
*   **Build Tool:** Vite for fast development and optimized production builds.
*   **Audio Engine:** Native **Web Audio API** (No external libraries like Tone.js). All logic is encapsulated in a Singleton service.
*   **Styling:** Tailwind CSS for all UI components, following a dark "FL Studio" inspired aesthetic.
*   **Icons:** Lucide React for consistent, scalable iconography.
*   **State Management:** React Context API combined with `useReducer` for predictable global state.
*   **Project Bundling:** JSZip for saving and loading project states as portable `.zip` files.
*   **Cross-Platform:** Electron (Desktop) and Capacitor (Android) wrappers.

## 📏 Development Rules

### 1. Audio Logic
*   **Singleton Pattern:** All Web Audio API interactions **must** go through the `audioEngine` singleton located in `services/audioEngine.ts`.
*   **No External Audio Libs:** Do not install or use libraries like Tone.js or Howler.js. Stick to native Web Audio nodes.
*   **Lifecycle:** Ensure audio nodes are properly disconnected or cleaned up in `audioEngine.reset()` to prevent memory leaks.

### 2. State Management
*   **Global State:** Use `AppContext.tsx` for shared state (tracks, transport, settings).
*   **Actions:** Always define new actions in the `Action` type and handle them in the `appReducer`.
*   **Immutability:** Never mutate state directly; always return new objects/arrays in the reducer.

### 3. UI & Styling
*   **Tailwind Only:** Use Tailwind CSS classes for all styling. Avoid inline styles unless calculating dynamic values (e.g., fader heights, track colors).
*   **Theme Consistency:** Maintain the dark, tactile UI. Use the `btn` class for buttons and follow the color palette defined in `types.ts` (`TRACK_COLORS`).
*   **Responsiveness:** Ensure the Mixer and Playlist views remain functional on smaller screens (mobile/tablet).

### 4. Components & Structure
*   **Modularity:** Keep components small and focused. If a component exceeds 100 lines, consider refactoring sub-components.
*   **Types:** Always reference `types.ts` for data structures. Do not define local interfaces for shared data like `TrackData` or `TransportState`.
*   **Performance:** Use `React.memo` for heavy UI elements like `MixerStrip` or `Track` to prevent unnecessary re-renders during playback.

### 5. File Handling
*   **JSZip:** When modifying project save/load logic, ensure all audio buffers are converted to Blobs/Wavs before being added to the zip.