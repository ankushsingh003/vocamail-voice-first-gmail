function playBeep(frequency = 440, duration = 200, volume = 0.3) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration / 1000);
}

let _mediaRecorder = null;
let _audioChunks = [];
let _resolveStop = null;

export async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    throw new Error(
      "Microphone access denied. Please allow microphone permission in your browser settings."
    );
  }

  playBeep(440, 220, 0.3);

  _audioChunks = [];

  const mimeType = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported("audio/ogg")
    ? "audio/ogg"
    : "audio/mp4";

  _mediaRecorder = new MediaRecorder(stream, { mimeType });

  _mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      _audioChunks.push(event.data);
    }
  };

  _mediaRecorder.onstop = () => {
    const audioBlob = new Blob(_audioChunks, { type: mimeType });
    stream.getTracks().forEach((track) => track.stop());

    if (_resolveStop) {
      _resolveStop(audioBlob);
      _resolveStop = null;
    }
  };

  _mediaRecorder.start(250);
  return true;
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!_mediaRecorder || _mediaRecorder.state === "inactive") {
      reject(new Error("No active recording to stop."));
      return;
    }

    playBeep(300, 250, 0.3);
    _resolveStop = resolve;
    _mediaRecorder.stop();
  });
}

export function isRecording() {
  return _mediaRecorder !== null && _mediaRecorder.state === "recording";
}
