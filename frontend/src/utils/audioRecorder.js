/**
 * audioRecorder.js — VocaMail's Ear (Browser Microphone Recorder)
 * ================================================================
 * Think of this file like the physical microphone button on a walkie-talkie.
 *
 * When you press the button:
 *   1. The browser asks your operating system: "May I use the microphone?" (permission check)
 *   2. You hear a short START beep tone (440 Hz) so blind users know recording has begun.
 *   3. Your voice is captured as a stream of audio data.
 *
 * When you release / press again to stop:
 *   1. You hear a lower STOP beep tone (300 Hz) so blind users know recording has ended.
 *   2. The audio stream is packaged into a single audio Blob (a chunk of raw bytes).
 *   3. That Blob is returned as a Promise result — ready to be sent to the Flask backend.
 *
 * Accessibility Note:
 *   All audio cues (beeps) are generated using the Web Audio API, which works even
 *   when screen readers or system audio is active. No images or colours needed to
 *   know when recording starts or stops — the sound tells you everything.
 */


// ---------------------------------------------------------------------------
// 1. The Sound-Making Machine (playBeep)
// ---------------------------------------------------------------------------
// Creates a pure electronic beep using Web Audio API.
// No MP3 or audio files needed — the browser generates the tone mathematically!
//
// frequency : How high-pitched the beep is (440 Hz = A note = "start", 300 Hz = "stop")
// duration  : How long the beep lasts in milliseconds (200ms = short blip)
// volume    : Loudness from 0 (silent) to 1 (full). We keep it gentle at 0.3.
function playBeep(frequency = 440, duration = 200, volume = 0.3) {
  // Web Audio API — the browser's built-in sound synthesizer
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return; // silently skip if browser doesn't support it

  const ctx = new AudioContext();

  // Oscillator = the tone generator (like a tuning fork at a specific pitch)
  const oscillator = ctx.createOscillator();

  // GainNode = the volume knob
  const gainNode = ctx.createGain();

  // Connect: oscillator → gain knob → speakers
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Set the pitch and waveform (sine = smooth, round tone)
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Set volume and schedule a gentle fade-out to avoid a harsh click at the end
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

  // Play the beep now, then stop after `duration` milliseconds
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration / 1000);
}


// ---------------------------------------------------------------------------
// 2. Module State — One Recorder at a Time
// ---------------------------------------------------------------------------
// We only allow one recording at a time.
// These variables keep track of the current active recording session.
let _mediaRecorder = null;  // The active MediaRecorder object (or null if idle)
let _audioChunks   = [];    // Collects raw audio data packets as they arrive
let _resolveStop   = null;  // The Promise "resolve" callback — called when recording ends


// ---------------------------------------------------------------------------
// 3. Start Recording (startRecording)
// ---------------------------------------------------------------------------
// Call this when the user presses the microphone button.
// It asks the browser for mic permission, plays a start beep, then begins capturing.
//
// Returns: a Promise that resolves to true when recording has successfully started,
//          or rejects with an error if the user denied mic permission.
export async function startRecording() {

  // Ask the operating system: "Can we use the microphone?"
  // This may show a popup asking the user for permission the first time.
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    // User denied permission or mic is not available
    throw new Error(
      "Microphone access denied. Please allow microphone permission in your browser settings."
    );
  }

  // Play the "recording started" beep (440 Hz = A note — the standard alert tone)
  playBeep(440, 220, 0.3);

  // Reset the audio data buffer for this new recording
  _audioChunks = [];

  // Choose the best audio format the browser supports:
  // - Chrome & Edge  : audio/webm (smaller file, widely supported by Whisper)
  // - Firefox        : audio/ogg
  // - Safari fallback: audio/mp4
  const mimeType = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported("audio/ogg")
    ? "audio/ogg"
    : "audio/mp4";

  // Create the recorder with our chosen format
  _mediaRecorder = new MediaRecorder(stream, { mimeType });

  // Every time the browser has a new packet of audio data, append it to our buffer
  _mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      _audioChunks.push(event.data);
    }
  };

  // When the recorder fully stops, stitch all packets into one Blob and resolve the Promise
  _mediaRecorder.onstop = () => {
    const audioBlob = new Blob(_audioChunks, { type: mimeType });

    // Release the microphone stream — turns off the red mic indicator dot in the browser tab
    stream.getTracks().forEach((track) => track.stop());

    // Hand the finished audio Blob back to whoever called stopRecording()
    if (_resolveStop) {
      _resolveStop(audioBlob);
      _resolveStop = null;
    }
  };

  // Begin capturing audio! Request a data packet every 250ms for smoother delivery
  _mediaRecorder.start(250);

  return true; // recording has started successfully
}


// ---------------------------------------------------------------------------
// 4. Stop Recording (stopRecording)
// ---------------------------------------------------------------------------
// Call this when the user presses the button again (or spacebar is released).
// Plays a stop beep, then returns a Promise that resolves to the audio Blob.
//
// Returns: Promise<Blob> — the complete audio recording, ready to POST to /api/voice
export function stopRecording() {
  return new Promise((resolve, reject) => {

    // Safety check: can't stop something that never started
    if (!_mediaRecorder || _mediaRecorder.state === "inactive") {
      reject(new Error("No active recording to stop."));
      return;
    }

    // Play the "recording stopped" beep (300 Hz = lower tone = done signal)
    playBeep(300, 250, 0.3);

    // Save the resolve callback — the onstop handler above will call it
    // with the assembled Blob once the recorder finishes
    _resolveStop = resolve;

    // Tell the recorder to finish and fire the onstop event
    _mediaRecorder.stop();
  });
}


// ---------------------------------------------------------------------------
// 5. Check if Currently Recording (isRecording)
// ---------------------------------------------------------------------------
// A simple helper for the UI — lets React know whether the mic is currently hot.
// Returns true while recording is in progress, false when idle.
export function isRecording() {
  return _mediaRecorder !== null && _mediaRecorder.state === "recording";
}
