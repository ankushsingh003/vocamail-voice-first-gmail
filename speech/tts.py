"""
speech/tts.py — The Voice of VocaMail (Text-to-Speech via gTTS)
================================================================
Think of this file like VocaMail's vocal cords.

After Whisper converts your voice into text (the ears),
this file does the opposite — it takes text (the assistant's reply)
and converts it into a spoken MP3 audio file that the browser can play
out loud through your speakers or headphones.

This is critically important for blind users:
  Instead of reading the reply on screen, the assistant SPEAKS it aloud.

How it works step by step:
  1. We take the reply text (e.g. "You have 3 unread emails from GitHub").
  2. We send it to Google's Text-to-Speech API (gTTS) over the internet.
  3. Google returns an MP3 audio file of a human-sounding voice reading that text.
  4. We save that MP3 file in the `static/audio/` folder with a unique name.
  5. We return the public URL of that file so the React frontend can play it.

Privacy Note:
  Audio files are temporary. After the browser has played them,
  the old files can be cleaned up to save disk space. Each new
  voice turn creates a fresh uniquely-named file so they never collide.
"""

import os
import uuid
import logging
from gtts import gTTS
import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Where to Save the Audio Files
# ---------------------------------------------------------------------------
# We store all generated MP3 files in the static/audio/ folder.
# Flask serves files from the static/ folder automatically at /static/audio/<filename>
# so the browser can load the audio URL directly without any special endpoint.
AUDIO_OUTPUT_DIR = os.path.join("static", "audio")


# ---------------------------------------------------------------------------
# Helper: Make Sure the Audio Folder Exists (_ensure_audio_dir)
# ---------------------------------------------------------------------------
# If the static/audio folder hasn't been created yet, make it now.
# os.makedirs(..., exist_ok=True) is safe — it does nothing if folder already exists.
def _ensure_audio_dir():
    """Creates the static/audio directory if it doesn't already exist."""
    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Main Function: Speak Text → Return Audio URL (speak)
# ---------------------------------------------------------------------------
# This is the only function you need to call from outside this file.
#
# Parameters:
#   text     : The sentence or paragraph to be spoken aloud.
#   lang     : Language code — "en" for English (default).
#              Other examples: "hi" for Hindi, "fr" for French.
#   slow     : If True, speaks more slowly — helpful for accessibility needs.
#
# Returns:
#   A string URL like "/static/audio/tts_abc123.mp3"
#   The React frontend plays this URL in an <audio> element.
#
# Raises:
#   RuntimeError if the gTTS API call fails (e.g. no internet connection).
def speak(text: str, lang: str = "en", slow: bool = False) -> str:
    """
    Converts text to a spoken MP3 file and returns the URL path for playback.

    Example:
        url = speak("You have 3 unread emails.")
        # Returns: "/static/audio/tts_4f2a1c.mp3"
    """
    # Safety check — don't try to speak empty text
    if not text or not text.strip():
        raise ValueError("Cannot speak empty text.")

    _ensure_audio_dir()

    # Generate a unique filename so multiple users or requests don't overwrite each other
    # e.g. "tts_3f7b2e1a4d8c.mp3"
    filename  = f"tts_{uuid.uuid4().hex[:12]}.mp3"
    file_path = os.path.join(AUDIO_OUTPUT_DIR, filename)

    # Use gTTS (Google Text-to-Speech) to generate the MP3 audio file
    # gTTS sends the text to Google's servers and downloads the audio
    try:
        tts = gTTS(text=text, lang=lang, slow=slow)
        tts.save(file_path)
        logger.info(f"[VocaMail] TTS saved: {file_path}")
    except Exception as e:
        raise RuntimeError(f"gTTS failed to generate audio: {e}")

    # Return the browser-accessible URL path (Flask serves /static/ automatically)
    audio_url = f"/static/audio/{filename}"
    return audio_url


# ---------------------------------------------------------------------------
# Optional Helper: Clean Up Old TTS Files (cleanup_old_audio)
# ---------------------------------------------------------------------------
# Over time, many small MP3 files can pile up in static/audio/.
# Call this function to delete files older than `max_age_seconds` seconds.
# By default, deletes files older than 10 minutes (600 seconds).
def cleanup_old_audio(max_age_seconds: int = 600) -> int:
    """
    Deletes TTS audio files older than max_age_seconds from the static/audio/ folder.
    Returns the count of files deleted.
    """
    import time

    if not os.path.isdir(AUDIO_OUTPUT_DIR):
        return 0

    now = time.time()
    deleted = 0

    for fname in os.listdir(AUDIO_OUTPUT_DIR):
        # Only clean up files we generated (they start with "tts_")
        if not fname.startswith("tts_") or not fname.endswith(".mp3"):
            continue

        fpath = os.path.join(AUDIO_OUTPUT_DIR, fname)
        try:
            file_age = now - os.path.getmtime(fpath)
            if file_age > max_age_seconds:
                os.remove(fpath)
                deleted += 1
        except OSError:
            pass  # file may have already been removed by another process

    if deleted:
        logger.info(f"[VocaMail] Cleaned up {deleted} old TTS audio file(s).")

    return deleted

