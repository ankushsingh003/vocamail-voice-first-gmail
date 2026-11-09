import os
import uuid
import logging
from gtts import gTTS
import config

logger = logging.getLogger(__name__)

AUDIO_OUTPUT_DIR = os.path.join("static", "audio")


def _ensure_audio_dir():
    os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)


def speak(text: str, lang: str = "en", slow: bool = False) -> str:
    if not text or not text.strip():
        raise ValueError("Cannot speak empty text.")

    _ensure_audio_dir()

    filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
    file_path = os.path.join(AUDIO_OUTPUT_DIR, filename)

    try:
        tts = gTTS(text=text, lang=lang, slow=slow)
        tts.save(file_path)
        logger.info(f"[VocaMail] TTS saved: {file_path}")
    except Exception as e:
        raise RuntimeError(f"gTTS failed to generate audio: {e}")

    return f"/static/audio/{filename}"


def cleanup_old_audio(max_age_seconds: int = 600) -> int:
    import time

    if not os.path.isdir(AUDIO_OUTPUT_DIR):
        return 0

    now = time.time()
    deleted = 0

    for fname in os.listdir(AUDIO_OUTPUT_DIR):
        if not fname.startswith("tts_") or not fname.endswith(".mp3"):
            continue

        fpath = os.path.join(AUDIO_OUTPUT_DIR, fname)
        try:
            file_age = now - os.path.getmtime(fpath)
            if file_age > max_age_seconds:
                os.remove(fpath)
                deleted += 1
        except OSError:
            pass

    if deleted:
        logger.info(f"[VocaMail] Cleaned up {deleted} old TTS audio file(s).")

    return deleted
