# 🎹 Simple Clip Launcher

A professional-grade, cross-platform audio clip launcher and mixer built with **React**, **TypeScript**, and the **Web Audio API**. 

This application functions similarly to a hardware groovebox or the "Session View" in DAWs like Ableton Live. It supports audio playback, real-time effects, MIDI mapping, and hardware input/output routing. It is designed to run on the Web, Desktop (Electron), and Mobile (Capacitor/Android).

## ✨ Features

*   **Clip Launching:** 32-pad grid (2 banks of 16) with drag-and-drop sample loading.
*   **Playback Modes:** One-Shot, Loop, and Gate (Trigger/Release).
*   **Real-time FX:** Per-pad effects chain including Reverb, Filter (Low-pass), Delay, Flanger, and Chorus.
*   **Non-destructive Editing:** Waveform visualizer with start/end trim points.
*   **Mixer View:** Dedicated faders, panning (future), dry/wet FX sends, and specific hardware output routing per channel.
*   **MIDI Mapping:** "Learn" mode to map MIDI controllers to pads, faders, and knobs.
*   **Audio Recording:**
    *   **Global:** Record the master output.
    *   **Clip:** Record microphone/line-in directly to a pad.
*   **Project Management:** Save and Load full projects (including audio samples) via `.zip`.

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
│   ├── AudioEditor.tsx  # Waveform visualization and trimming
│   ├── Knob.tsx         # SVG-based rotary control
│   ├── MixerStrip.tsx   # Channel strip (Volume, FX, Routing)
│   └── Pad.tsx          # Grid button behavior and status
├── electron/            # Electron main process files
├── services/
│   └── audioEngine.ts   # SINGLETON: Core Web Audio API logic
├── App.tsx              # Main Application Container & State Manager
├── types.ts             # TypeScript Interfaces & Enums
└── index.html           # Entry point
```

## 🎧 Audio Engine Architecture

The core logic resides in `services/audioEngine.ts`. This is a Singleton class that wraps the browser's `AudioContext`.

*   **State Management:** React manages the UI state (`pads`, `transport`), while `AudioEngine` manages the imperative Audio Node graph.
*   **Routing:**
    *   `SourceNode` -> `Dry/Wet Nodes` -> `Channel Gain` -> `Master Gain` -> `Destination`.
    *   **Hardware Routing:** Uses `setSinkId` (where supported) to route specific pads to specific audio interface outputs (e.g., for click tracks or cueing).
*   **Metronome:** Implemented using a look-ahead scheduler (`setTimeout` + `ctx.currentTime`) to ensure tight timing regardless of the main thread load.
*   **Recording:** Uses `MediaStreamDestination` and `MediaRecorder` API.

## 🎛 MIDI Implementation

MIDI logic is handled in `App.tsx` via `navigator.requestMIDIAccess`.

*   **Architecture:** The app maintains a `isMidiMappingMode` state.
*   **Mapping:** When active, clicking a UI element sets a `mappingTarget`. The next incoming MIDI message (NoteOn or CC) is bound to that target in the Pad's state data.
*   **Playback:** Incoming MIDI messages are routed to `audioEngine.playPad` or state updaters (Volume/FX) based on the stored mapping configuration.

## 🤝 Contributing

Collaborations are welcome! Please follow these steps:

1.  **Fork** the repository.
2.  Create a **Feature Branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  Open a **Pull Request**.

### TODOs / Roadmap
*   [ ] Add Pan controls to the Mixer.
*   [ ] Implement "Piano Roll" or Sequencer view.
*   [ ] Add Master Bus limiter visualizer.
*   [ ] Improve iOS support (Audio Context unlocking).

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.