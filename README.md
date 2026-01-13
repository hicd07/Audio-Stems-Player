# 🎹 Stem Player & Mixer

A professional-grade, cross-platform stem player and audio mixer built with **React**, **TypeScript**, and the **Web Audio API**. This application was originally developed by **hicd07**.

This application functions as a digital audio workstation (DAW) focused on playing and mixing pre-recorded audio stems. It's ideal for producers who want to mix their multi-tracked songs, for live performers who need to play back-synced tracks, or for anyone wanting to deconstruct and work with song stems. It is designed to run on the Web, Desktop (Electron), and Mobile (Capacitor/Android).

## ✨ Features

*   **Multi-track Playlist View:** A timeline-based interface to arrange and visualize your audio stems.
    *   Displays audio waveforms for each track.
    *   Supports horizontal (time) and vertical (track height) zooming.
    *   Easy drag-and-drop loading of audio files directly onto tracks.
*   **Full-featured Mixer:** A dedicated mixer view for fine-tuning your sound.
    *   Per-track controls for Volume, Pan, Mute, and Solo.
    *   Hardware output routing for each track, allowing for complex setups (e.g., sending a click track to a specific output).
    *   Clipping indicators to monitor audio levels.
*   **Real-time FX:** A per-track effects chain including Reverb, Low-Pass Filter, Delay, Flanger, and Chorus.
*   **Non-destructive Editing:** Waveform visualizer with start/end trim points for each clip.
*   **MIDI Mapping:** An intuitive "Learn" mode to map MIDI controller knobs, faders, and buttons to controls like volume, pan, mute, and solo.
*   **Audio Recording:**
    *   **Global:** Record the master output mix.
    *   **Track:** Record an external audio source (microphone/line-in) directly onto a track.
*   **Advanced Transport:** Global controls for Play/Pause, Stop, Loop, and BPM. Includes a highly configurable metronome with multiple sounds and dedicated output routing.
*   **Project Management:** Save and Load entire projects, including audio samples, track settings, and MIDI mappings, into a single `.zip` file for easy portability.

## 🛠 Tech Stack

*   **Frontend:** React 18, TypeScript
*   **Styling:** Tailwind CSS, Lucide React (Icons)
*   **Build Tool:** Vite
*   **Audio Engine:** Native Web Audio API (No external audio libraries used)
*   **Desktop Wrapper:** Electron
*   **Mobile Wrapper:** Capacitor (Android)
*   **File Handling:** JSZip (for project bundles)

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/simple-clip-launcher.git
    cd simple-clip-launcher
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server (Web version):
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

### Building for Desktop (Electron)

To build the desktop executable:
```bash
npm run electron:build
```
*Output will be located in `dist_electron/`.*

### Building for Android

**First Time Setup (or if you see "Gradle build" errors):**
1. Delete the `android` folder if it exists.
2. Run:
   ```bash
   npm run android:init
   ```

**Subsequent Builds:**
Run the single command below to build web assets, sync with Capacitor, and open Android Studio:
```bash
npm run android:build
```

## 📂 Project Structure

```text
/
├── components/          # React UI Components
│   ├── PlaylistView.tsx # Main timeline/arrangement view
│   ├── MixerStrip.tsx   # Channel strip (Volume, Pan, FX, Routing)
│   ├── Track.tsx        # Track header in the playlist view
│   ├── Knob.tsx         # SVG-based rotary control
│   └── VerticalFader.tsx# Fader control for volume
├── electron/            # Electron main process files
├── services/
│   └── audioEngine.ts   # SINGLETON: Core Web Audio API logic
├── contexts/
|   └── AppContext.tsx   # Global state management (React Context + useReducer)
├── hooks/               # Custom React hooks
│   ├── useAudioEngine.ts# Connects React state to the Audio Engine
│   └── useTransport.ts  # Handles playback logic and timeline updates
├── App.tsx              # Main Application Container & Layout
├── types.ts             # TypeScript Interfaces & Enums
└── index.html           # Entry point
```

## 🎧 Audio Engine Architecture

The core logic resides in `services/audioEngine.ts`. This is a Singleton class that wraps the browser's `AudioContext`.

*   **State Management:** React (`AppContext.tsx`) manages the UI state (`tracks`, `transport`), while `AudioEngine` manages the imperative Audio Node graph.
*   **Routing:**
    *   `AudioBufferSourceNode` -> `Effects Chain` -> `Channel Gain/Pan` -> `Master Gain` -> `Destination`.
    *   **Hardware Routing:** Uses `setSinkId` (where supported) on dedicated `<audio>` elements to route specific tracks to different physical audio interface outputs.
*   **Metronome:** Implemented using a look-ahead scheduler (`setTimeout` + `ctx.currentTime`) to ensure tight timing regardless of the main thread load.
*   **Recording:** Uses `MediaStreamDestinationNode` and the `MediaRecorder` API.

## 🎛 MIDI Implementation

MIDI logic is handled in `AppContext.tsx` via `navigator.requestMIDIAccess`.

*   **Architecture:** The app maintains a `isMidiLearn` state.
*   **Mapping:** When active, clicking a UI element (like a fader or knob) sets a `mappingTarget`. The next incoming MIDI CC message is then bound to that target.
*   **Playback:** Incoming MIDI messages are checked against the stored mappings and dispatch state updates (e.g., for Volume/Pan) accordingly.

## 🤝 Contributing

Collaborations are welcome! Please follow these steps:

1.  **Fork** the repository.
2.  Create a **Feature Branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  Open a **Pull Request**.

### TODOs / Roadmap
*   [ ] Implement "Piano Roll" or Sequencer view.
*   [ ] Add Master Bus limiter visualizer.
*   [ ] Improve iOS support (Audio Context unlocking).
*   [ ] Add more real-time effects (e.g., Compressor, EQ per track).

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgements

This project was developed by **hicd07**.
