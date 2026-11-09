import os
import logging
from typing import Optional
import config

logger = logging.getLogger(__name__)


def _transcribe_via_api(audio_path: str) -> str:
    api_key = getattr(config, "OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE":
        raise ValueError("OPENAI_API_KEY is not set.")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("The 'openai' package is not installed.")

    client = OpenAI(api_key=api_key)

    logger.info(f"[VocaMail] Sending audio to Whisper API: {os.path.basename(audio_path)}")

    with open(audio_path, "rb") as audio_file:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )

    transcript = response.text.strip() if response.text else ""
    logger.info(f"[VocaMail] Whisper API transcribed: \"{transcript}\"")
    return transcript


def _transcribe_locally(audio_path: str) -> str:
    import shutil

    if not shutil.which("ffmpeg"):
        try:
            import imageio_ffmpeg
            ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            bin_dir = os.path.dirname(ffmpeg_bin)
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
        raise RuntimeError("Local Whisper requires 'openai-whisper'.")

    model_name = getattr(config, "WHISPER_MODEL", "base")
    logger.info(f"[VocaMail] Loading local Whisper model '{model_name}'…")
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, language="en", fp16=False)
    transcript = result.get("text", "").strip()
    logger.info(f"[VocaMail] Local Whisper transcribed: \"{transcript}\"")
    return transcript


def transcribe_audio(audio_path: str, auto_delete: bool = True) -> str:
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
        if auto_delete and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.debug(f"[VocaMail] Deleted temp audio: {audio_path}")
            except OSError as err:
                logger.warning(f"[VocaMail] Could not delete temp audio {audio_path}: {err}")
