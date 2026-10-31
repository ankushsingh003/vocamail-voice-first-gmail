"""
speech/transcribe.py — The Ear of VocaMail (Whisper Speech-to-Text)
===================================================================
Think of this file like the assistant's ears.

When you speak into your microphone, the browser captures the soundwaves,
packs them into a small audio file (e.g. .webm or .wav), and sends it to Flask.
This file receives that audio, listens to it using OpenAI's Whisper AI model,
and writes down the exact words you said into plain English text.

Key Features:
  1. Smart In-Memory Caching:
     Neural network models are heavy. If we loaded Whisper from scratch on
     every button press, you'd wait 10 seconds every time you spoke.
     Instead, we load the model once into memory (`_cached_model`) and reuse
     it instantly for all future voice turns!
  2. Dual Modes (Local or Cloud API):
     - Local: Runs 100% on your laptop's CPU for free, completely offline.
     - API: Uses OpenAI's cloud endpoint if you provided an OPENAI_API_KEY.
  3. Absolute Privacy:
     Voice recordings are temporary. Once the words are transcribed, this file
     immediately deletes the audio file from disk so your private voice never lingers.
"""

import os
import logging
from typing import Optional
import config

logger = logging.getLogger(__name__)

# Global cache so Whisper stays hot in memory instead of reloading every turn
_cached_model = None


# ---------------------------------------------------------------------------
# 1. Load Whisper Model into Memory (_get_whisper_model)
# ---------------------------------------------------------------------------
# Loads the neural network once on first use and keeps it ready in RAM.
def _get_whisper_model():
    """Loads and caches the Whisper model on demand to keep speech turns snappy."""
    global _cached_model
    if _cached_model is None:
        try:
            import whisper
            model_name = getattr(config, "WHISPER_MODEL", "base")
            logger.info(f"[VocaMail] Loading Whisper model '{model_name}' into memory…")
            _cached_model = whisper.load_model(model_name)
            logger.info("[VocaMail] Whisper model loaded and ready!")
        except ImportError:
            raise RuntimeError(
                "The 'whisper' package is not installed. Run 'pip install openai-whisper'."
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load Whisper model: {e}")

    return _cached_model


# ---------------------------------------------------------------------------
# 2. Cloud Whisper API Transcriber (_transcribe_via_api)
# ---------------------------------------------------------------------------
# If you prefer using OpenAI's cloud servers (useful if on a very slow computer),
# this function sends the audio file to OpenAI's transcriptions API.
def _transcribe_via_api(audio_path: str) -> str:
    """Sends the audio clip to OpenAI's Whisper API and returns the text."""
    import requests

    api_key = getattr(config, "OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set in your .env file.")

    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}

    with open(audio_path, "rb") as f:
        files = {"file": f}
        data = {"model": "whisper-1", "language": "en"}
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)

    if response.status_code != 200:
        raise RuntimeError(f"OpenAI Whisper API error: {response.text}")

    result = response.json()
    return result.get("text", "").strip()


# ---------------------------------------------------------------------------
# 3. Local Whisper Transcriber (_transcribe_locally)
# ---------------------------------------------------------------------------
# Runs the speech recognition model directly on your laptop's CPU.
# fp16=False ensures it runs smoothly on standard computer processors without GPU.
def _transcribe_locally(audio_path: str) -> str:
    """Transcribes audio using your local CPU without sending any data over the internet."""
    model = _get_whisper_model()
    # fp16=False prevents warnings on CPU-only machines
    result = model.transcribe(audio_path, language="en", fp16=False)
    return result.get("text", "").strip()


# ---------------------------------------------------------------------------
# 4. Master Transcribe Function with Automatic Privacy Cleanup
# ---------------------------------------------------------------------------
# This is the main entry point called by app.py:
# 1. Takes the recorded audio file path.
# 2. Transcribes it (locally or via API).
# 3. Automatically deletes the audio file from disk for privacy.
# 4. Returns the clean string of transcribed words.
def transcribe_audio(audio_path: str, auto_delete: bool = True) -> str:
    """
    Transcribes an audio file to text and automatically wipes the file for privacy.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found at: {audio_path}")

    try:
        mode = getattr(config, "WHISPER_MODE", "local").lower()

        if mode == "api":
            transcript = _transcribe_via_api(audio_path)
        else:
            transcript = _transcribe_locally(audio_path)

        logger.info(f"[VocaMail] Transcribed: \"{transcript}\"")
        return transcript

    finally:
        # Privacy guarantee: Always delete the temporary recording after transcription
        if auto_delete and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError as err:
                logger.warning(f"[VocaMail] Could not delete temp audio file {audio_path}: {err}")

