"""
speech/transcribe.py — The Ear of VocaMail (Whisper Speech-to-Text)
===================================================================
Think of this file like the assistant's ears.

When you speak into your microphone, the browser captures your voice,
packs it into a small audio file (.webm or .wav), and sends it to Flask.
This module receives that audio and sends it to OpenAI's Whisper API —
the same service powering ChatGPT's voice mode — to convert speech to text.

Why Whisper API (not local)?
  - Zero setup: no local model files to download (1–3 GB), no GPU needed.
  - Faster: OpenAI's servers are optimized and handle your 2–5 second clip in <1s.
  - More accurate: whisper-1 on the cloud beats the local 'base' model every time.
  - Multilingual: automatically detects and transcribes 50+ languages.

Voice Flow:
  Browser mic → .webm blob → POST /api/voice → transcribe_audio() → Whisper API
  → plain English text → back to App.jsx → search bar or compose body

Privacy:
  Audio files are deleted from disk immediately after transcription.
  OpenAI's API does not retain audio for training (see their usage policies).
"""

import os
import logging
from typing import Optional
import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Cloud Whisper API Transcriber (Primary — via OpenAI Python SDK)
# ---------------------------------------------------------------------------
def _transcribe_via_api(audio_path: str) -> str:
    """
    Sends the audio clip to OpenAI's Whisper API and returns the transcribed text.

    Uses the official openai Python SDK which handles:
      - Authentication (Bearer token)
      - Automatic retries on transient network errors
      - Proper multipart file upload
      - Detailed error messages

    Model: whisper-1
      OpenAI's production Whisper model — accurate, fast, handles accents well.
    """
    api_key = getattr(config, "OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE":
        raise ValueError(
            "OPENAI_API_KEY is not set in your .env file. "
            "Get your key from https://platform.openai.com/api-keys "
            "and add it to .env as: OPENAI_API_KEY=sk-..."
        )

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError(
            "The 'openai' package is not installed. Run: pip install openai"
        )

    client = OpenAI(api_key=api_key)

    logger.info(f"[VocaMail] Sending audio to Whisper API: {os.path.basename(audio_path)}")

    with open(audio_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            # Let Whisper auto-detect the language for maximum flexibility.
            # To force English, uncomment: language="en"
        )

    transcript = response.text.strip() if response.text else ""
    logger.info(f"[VocaMail] Whisper API transcribed: \"{transcript}\"")
    return transcript


# ---------------------------------------------------------------------------
# 2. Local Whisper Fallback (Only if WHISPER_MODE=local in .env)
# ---------------------------------------------------------------------------
# This runs the model directly on your CPU — no internet needed but requires
# 'openai-whisper' + ffmpeg to be installed, and takes 10-30s to load on first use.
def _transcribe_locally(audio_path: str) -> str:
    """
    Transcribes audio using the local Whisper model running on your CPU.
    Only activated when WHISPER_MODE=local is set in .env.
    """
    import shutil

    # Ensure ffmpeg is on PATH (needed by local whisper for audio decoding)
    if not shutil.which("ffmpeg"):
        try:
            import imageio_ffmpeg
            ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            bin_dir = os.path.dirname(ffmpeg_bin)
            # Alias to 'ffmpeg.exe' so whisper finds it by its expected name
            target_path = os.path.join(bin_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
            if not os.path.exists(target_path):
                shutil.copyfile(ffmpeg_bin, target_path)
            if bin_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
                logger.info(f"[VocaMail] Registered bundled ffmpeg: {bin_dir}")
        except Exception as err:
            logger.warning(f"[VocaMail] Could not auto-register ffmpeg: {err}")

    try:
        import whisper
    except ImportError:
        raise RuntimeError(
            "Local Whisper requires 'openai-whisper'. Run: pip install openai-whisper\n"
            "Or set WHISPER_MODE=api in .env to use the OpenAI cloud API instead."
        )

    model_name = getattr(config, "WHISPER_MODEL", "base")
    logger.info(f"[VocaMail] Loading local Whisper model '{model_name}'…")
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, language="en", fp16=False)
    transcript = result.get("text", "").strip()
    logger.info(f"[VocaMail] Local Whisper transcribed: \"{transcript}\"")
    return transcript


# ---------------------------------------------------------------------------
# 3. Master Entry Point — transcribe_audio()
# ---------------------------------------------------------------------------
# Called by app.py POST /api/voice handler.
# Automatically routes to API or local mode based on WHISPER_MODE in .env.
# Always deletes the temp audio file after transcription for privacy.
def transcribe_audio(audio_path: str, auto_delete: bool = True) -> str:
    """
    Transcribes an audio file to text, then deletes it for privacy.

    Args:
        audio_path:  Path to the temporary audio file saved by Flask.
        auto_delete: If True (default), deletes the file after transcription.

    Returns:
        Plain English string of everything the user said.

    Raises:
        FileNotFoundError: If the audio file doesn't exist.
        ValueError:        If OPENAI_API_KEY is missing (API mode).
        RuntimeError:      If Whisper fails to transcribe.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    try:
        mode = getattr(config, "WHISPER_MODE", "api").lower()
        logger.info(f"[VocaMail] Transcription mode: {mode}")

        if mode == "api":
            transcript = _transcribe_via_api(audio_path)
        else:
            transcript = _transcribe_locally(audio_path)

        return transcript

    finally:
        # Privacy guarantee: wipe the recording immediately after transcription
        if auto_delete and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.debug(f"[VocaMail] Deleted temp audio: {audio_path}")
            except OSError as err:
                logger.warning(f"[VocaMail] Could not delete temp audio {audio_path}: {err}")
