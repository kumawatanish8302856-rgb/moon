import asyncio
import os
import re
import shutil
import ssl
import subprocess
import urllib.parse
from typing import AsyncGenerator, Dict, Generator, List, Optional

# Disable strict SSL verification to prevent failures caused by antivirus / proxy / self-signed certs
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except Exception:
    pass

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import yt_dlp

app = FastAPI(
    title="MOONFLOW Media Downloader API",
    description="High-performance media extractor and fragmented stream remuxer using yt-dlp & FFmpeg",
    version="1.0.0",
)

# Enable CORS for React Native & Web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "Accept-Ranges"],
)

def find_ffmpeg() -> str:
    # 1. Check system PATH
    found = shutil.which("ffmpeg")
    if found:
        return found
    # 2. Check WinGet Packages on Windows
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        winget_path = os.path.join(local_app_data, "Microsoft", "WinGet", "Packages")
        if os.path.exists(winget_path):
            for root, _, files in os.walk(winget_path):
                if "ffmpeg.exe" in files:
                    return os.path.join(root, "ffmpeg.exe")
    # 3. Check common candidate paths
    for candidate in [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    ]:
        if os.path.exists(candidate):
            return candidate
    return "ffmpeg"


FFMPEG_BIN = find_ffmpeg()


class InfoRequest(BaseModel):
    url: str


class FormatOption(BaseModel):
    id: str
    label: str
    type: str  # 'video' or 'audio'
    quality: str
    ext: str
    size_estimate: Optional[str] = None
    direct_url: Optional[str] = None
    native: bool = True


class MediaInfoResponse(BaseModel):
    id: str
    url: str
    platform: str
    title: str
    thumbnail: str
    author: str
    duration: Optional[str] = None
    views: Optional[str] = None
    formats: List[FormatOption]


def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "00:00"
    mins, secs = divmod(int(seconds), 60)
    hours, mins = divmod(mins, 60)
    if hours > 0:
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def find_cookies_file() -> Optional[str]:
    # 1. backend/cookies.txt
    backend_cookies = os.path.join(os.path.dirname(__file__), "cookies.txt")
    if os.path.exists(backend_cookies):
        return backend_cookies
    # 2. project root cookies.txt
    root_cookies = os.path.join(os.path.dirname(__file__), "..", "cookies.txt")
    if os.path.exists(root_cookies):
        return root_cookies
    # 3. User profile cookies.txt
    user_home = os.path.expanduser("~")
    home_cookies = os.path.join(user_home, "cookies.txt")
    if os.path.exists(home_cookies):
        return home_cookies
    return None


def extract_ydl_info(url: str) -> dict:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "nocheckcertificate": True,
        "extract_flat": False,
        "skip_download": True,
        "socket_timeout": 12,
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
    cookies_path = find_cookies_file()
    if cookies_path:
        ydl_opts["cookiefile"] = cookies_path

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "MOONFLOW Media Downloader API",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "ffmpeg_available": shutil.which(FFMPEG_BIN) is not None}


@app.post("/info", response_model=MediaInfoResponse)
@app.get("/info", response_model=MediaInfoResponse)
async def get_media_info(url: str = Query(...)):
    """
    Extracts video/audio metadata using yt-dlp without downloading media files.
    Priority 1 optimization: provides native stream-copyable formats and native audio (m4a/opus)
    by default so transcoding is completely avoided.
    """
    clean_url = url.strip()
    if not clean_url:
        raise HTTPException(status_code=400, detail="Empty URL provided")

    try:
        # Run blocking yt-dlp extraction in a thread pool
        info = await asyncio.to_thread(extract_ydl_info, clean_url)
    except Exception as e:
        err_str = str(e)
        if "empty media response" in err_str or "login" in err_str.lower():
            raise HTTPException(
                status_code=400,
                detail="Instagram requires authentication for this post. Please try another link or add cookies.txt to backend.",
            )
        raise HTTPException(status_code=400, detail=f"Failed to extract info: {err_str}")

    video_id = info.get("id", "media")
    title = info.get("title", f"Media {video_id}")
    thumbnail = info.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    author = info.get("uploader") or info.get("channel") or info.get("extractor_key") or "Creator"
    duration = format_duration(info.get("duration"))
    view_count = info.get("view_count")
    views_str = f"{view_count:,} views" if view_count else None

    # Identify platform
    extractor = (info.get("extractor") or "").lower()
    platform = "youtube" if "youtube" in extractor else "instagram" if "instagram" in extractor else "other"

    formats_list: List[FormatOption] = []
    available_formats = info.get("formats", [])

    # Collect available video resolutions dynamically
    found_heights = set()
    for f in available_formats:
        vcodec = f.get("vcodec", "none")
        height = f.get("height")
        if vcodec != "none" and height and height > 0:
            if height not in found_heights:
                found_heights.add(height)
                size_bytes = f.get("filesize") or f.get("filesize_approx")
                size_est = f"~{size_bytes / (1024 * 1024):.1f} MB" if size_bytes else None

                label = f"{height}p"
                if height >= 2160:
                    label = f"{height}p 4K UHD"
                elif height >= 1440:
                    label = f"{height}p 2K QHD"
                elif height >= 720:
                    label = f"{height}p HD"

                formats_list.append(
                    FormatOption(
                        id=f"video_{height}p",
                        label=label,
                        type="video",
                        quality=f"{height}p",
                        ext="mp4",
                        size_estimate=size_est,
                        native=True,
                    )
                )

    # Sort video formats descending (e.g. 2160p down to 360p)
    def parse_resolution_num(opt: FormatOption) -> int:
        match = re.search(r"(\d+)", opt.quality)
        return int(match.group(1)) if match else 0

    formats_list.sort(key=parse_resolution_num, reverse=True)

    # If no separate video stream resolutions found, check if a general video stream exists
    if not formats_list:
        formats_list.append(
            FormatOption(
                id="video_best",
                label="Best Quality MP4",
                type="video",
                quality="Best",
                ext="mp4",
                size_estimate=None,
                native=True,
            )
        )

    # Audio formats:
    has_audio = any(f.get("acodec") != "none" for f in available_formats)
    if has_audio:
        # Priority 1: Native m4a/aac directly by default (zero transcoding)
        m4a_fmt = next((f for f in available_formats if f.get("vcodec") == "none" and f.get("ext") == "m4a"), None)
        m4a_size = (m4a_fmt.get("filesize") or m4a_fmt.get("filesize_approx")) if m4a_fmt else None
        m4a_size_est = f"~{m4a_size / (1024 * 1024):.1f} MB" if m4a_size else None

        formats_list.append(
            FormatOption(
                id="audio_native_m4a",
                label="Native AAC/M4A (Fastest)",
                type="audio",
                quality="Native M4A",
                ext="m4a",
                size_estimate=m4a_size_est,
                native=True,
            )
        )

        # Native Opus / WebM audio
        opus_fmt = next((f for f in available_formats if f.get("vcodec") == "none" and "opus" in (f.get("acodec") or "").lower()), None)
        opus_size = (opus_fmt.get("filesize") or opus_fmt.get("filesize_approx")) if opus_fmt else None
        opus_size_est = f"~{opus_size / (1024 * 1024):.1f} MB" if opus_size else None

        formats_list.append(
            FormatOption(
                id="audio_native_opus",
                label="Native Opus (HQ)",
                type="audio",
                quality="Native Opus",
                ext="webm",
                size_estimate=opus_size_est,
                native=True,
            )
        )

        # Optional MP3 conversion (marked native=False)
        formats_list.append(
            FormatOption(
                id="audio_mp3_convert",
                label="MP3 Audio (Optional Convert)",
                type="audio",
                quality="320 kbps MP3",
                ext="mp3",
                size_estimate=None,
                native=False,
            )
        )

    return MediaInfoResponse(
        id=video_id,
        url=clean_url,
        platform=platform,
        title=title,
        thumbnail=thumbnail,
        author=author,
        duration=duration,
        views=views_str,
        formats=formats_list,
    )


def pipe_ffmpeg_stream(
    cmd: List[str], chunk_size: int = 64 * 1024
) -> Generator[bytes, None, None]:
    """
    Spawns FFmpeg subprocess and streams fragmented output chunks synchronously in threadpool.
    Using standard subprocess.Popen avoids Windows SelectorEventLoop NotImplementedError.
    Cleans up and terminates the process immediately if the client disconnects.
    """
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=chunk_size,
    )

    try:
        assert process.stdout is not None
        while True:
            chunk = process.stdout.read(chunk_size)
            if not chunk:
                break
            yield chunk
    except (GeneratorExit, BaseException):
        if process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=2)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass
        raise
    finally:
        if process.stdout:
            try:
                process.stdout.close()
            except Exception:
                pass
        if process.stderr:
            try:
                process.stderr.close()
            except Exception:
                pass
        if process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=2)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass


@app.get("/download")
async def download_media(
    url: str = Query(..., description="Media URL"),
    format_id: str = Query("video_720p", description="Chosen format identifier"),
    convert_mp3: bool = Query(False, description="Whether to convert audio to MP3 or serve native m4a"),
):
    """
    Priority 1 Core Optimizations:
    1. FFmpeg Stream Copy (-c copy): Never re-encodes. Video and audio are muxed in memory.
    2. Fragmented MP4 Piping: Uses -movflags frag_keyframe+empty_moov+default_base_moof to pipe
       directly to stdout (pipe:1), so download begins on the mobile device in < 1 second.
    3. Native Audio by default: Streams raw m4a/opus unless convert_mp3 is explicitly True.
    """
    clean_url = url.strip()
    if not clean_url:
        raise HTTPException(status_code=400, detail="Missing URL parameter")

    # Extract direct stream URLs for the requested format via yt-dlp
    try:
        info = await asyncio.to_thread(extract_ydl_info, clean_url)
    except Exception as e:
        err_str = str(e)
        if "empty media response" in err_str or "login" in err_str.lower():
            raise HTTPException(
                status_code=400,
                detail="Instagram requires authentication for this post. Please add cookies.txt to backend.",
            )
        raise HTTPException(status_code=400, detail=f"Extraction error: {err_str}")

    title = info.get("title", "media")
    safe_filename = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).strip()[:40] or "download"

    is_audio = "audio" in format_id or format_id.startswith("audio_")

    if is_audio:
        # Find best audio stream URL
        audio_url = None
        best_audio = None
        for f in info.get("formats", []):
            if f.get("vcodec") == "none" and f.get("acodec") != "none" and f.get("url"):
                # Prefer m4a if not converting to mp3
                if not convert_mp3 and (f.get("ext") == "m4a" or "mp4a" in (f.get("acodec") or "")):
                    best_audio = f
                    break
                best_audio = f

        audio_url = (best_audio or {}).get("url")
        if not audio_url:
            raise HTTPException(status_code=404, detail="Could not find audio stream")

        if convert_mp3:
            # Transcode audio to MP3 only if explicitly requested
            ffmpeg_cmd = [
                FFMPEG_BIN,
                "-y",
                "-loglevel", "error",
                "-i", audio_url,
                "-vn",
                "-c:a", "libmp3lame",
                "-b:a", "320k",
                "-f", "mp3",
                "pipe:1",
            ]
            content_type = "audio/mpeg"
            filename = f"{safe_filename}.mp3"
        else:
            # PRIORITY 1: Stream copy native M4A/AAC directly with zero re-encoding!
            is_aac = (best_audio or {}).get("ext") == "m4a" or "mp4a" in ((best_audio or {}).get("acodec") or "")
            if is_aac:
                ffmpeg_cmd = [
                    FFMPEG_BIN,
                    "-y",
                    "-loglevel", "error",
                    "-i", audio_url,
                    "-vn",
                    "-c:a", "copy",
                    "-bsf:a", "aac_adtstoasc",
                    "-f", "mp4",
                    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                    "pipe:1",
                ]
                content_type = "audio/mp4"
                filename = f"{safe_filename}.m4a"
            else:
                # Native opus/webm stream copy
                ffmpeg_cmd = [
                    FFMPEG_BIN,
                    "-y",
                    "-loglevel", "error",
                    "-i", audio_url,
                    "-vn",
                    "-c:a", "copy",
                    "-f", "webm",
                    "pipe:1",
                ]
                content_type = "audio/webm"
                filename = f"{safe_filename}.webm"

    else:
        # Video Download
        # Target height extracted dynamically from format_id (e.g. video_1080p, video_720p, etc.)
        height_match = re.search(r"(\d+)p?", format_id)
        target_height = int(height_match.group(1)) if height_match else None

        video_stream_url = None

        # Look for matching video stream
        for f in info.get("formats", []):
            if f.get("vcodec") != "none":
                h = f.get("height")
                if target_height and h == target_height and f.get("url"):
                    video_stream_url = f.get("url")
                    break

        if not video_stream_url:
            # Fallback to best available video stream
            for f in reversed(info.get("formats", [])):
                if f.get("vcodec") != "none" and f.get("url"):
                    video_stream_url = f.get("url")
                    break

        # Best audio stream: prefer m4a/aac for seamless mp4 muxing
        best_m4a = None
        best_other_audio = None
        for f in info.get("formats", []):
            if f.get("vcodec") == "none" and f.get("acodec") != "none" and f.get("url"):
                if f.get("ext") == "m4a" or "mp4a" in (f.get("acodec") or ""):
                    best_m4a = f
                else:
                    best_other_audio = f

        selected_audio = best_m4a or best_other_audio
        audio_stream_url = (selected_audio or {}).get("url")

        if not video_stream_url:
            raise HTTPException(status_code=404, detail="Could not find matching video stream")

        # PRIORITY 1: FFmpeg stream copy with fragmented MP4 piping
        if audio_stream_url:
            is_aac = (selected_audio or {}).get("ext") == "m4a" or "mp4a" in ((selected_audio or {}).get("acodec") or "")
            bsf_args = ["-bsf:a", "aac_adtstoasc"] if is_aac else []
            ffmpeg_cmd = [
                FFMPEG_BIN,
                "-y",
                "-loglevel", "error",
                "-i", video_stream_url,
                "-i", audio_stream_url,
                "-c", "copy",  # NEVER RE-ENCODE
                *bsf_args,
                "-f", "mp4",
                "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                "pipe:1",
            ]
        else:
            # Single stream containing both or video-only
            ffmpeg_cmd = [
                FFMPEG_BIN,
                "-y",
                "-loglevel", "error",
                "-i", video_stream_url,
                "-c", "copy",  # NEVER RE-ENCODE
                "-f", "mp4",
                "-movflags", "frag_keyframe+empty_moov+default_base_moof",
                "pipe:1",
            ]

        content_type = "video/mp4"
        filename = f"{safe_filename}.mp4"

    encoded_filename = urllib.parse.quote(filename)

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_filename}"; filename*=UTF-8\'\'{encoded_filename}',
        "Accept-Ranges": "none",
        "Cache-Control": "no-cache",
    }

    return StreamingResponse(
        pipe_ffmpeg_stream(ffmpeg_cmd),
        media_type=content_type,
        headers=headers,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
