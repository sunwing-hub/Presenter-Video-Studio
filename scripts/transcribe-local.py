#!/usr/bin/env python3
"""Generate an editable SRT from a local video with the cached Whisper model.

This script is intentionally offline. The Node middleware passes an explicit
model directory and refuses to download a model implicitly.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path


def timestamp(seconds: float) -> str:
    milliseconds = max(0, int(round(seconds * 1000)))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1_000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--model-dir", required=True, type=Path)
    parser.add_argument("--language", default="zh")
    args = parser.parse_args()

    model_file = args.model_dir / f"{args.model}.pt"
    if not model_file.is_file():
        raise RuntimeError(
            f"本地 Whisper 模型不存在：{model_file}。"
            "请先准备模型，或设置 OVERLAY_WHISPER_MODEL_DIR。"
        )

    try:
        import whisper  # type: ignore
    except Exception as error:
        raise RuntimeError(f"本地 Whisper 环境不可用：{error}") from error

    model = whisper.load_model(
        args.model,
        device="cpu",
        download_root=str(args.model_dir),
        in_memory=False,
    )
    result = model.transcribe(
        str(args.input),
        language=args.language,
        task="transcribe",
        fp16=False,
        verbose=False,
        temperature=0,
        condition_on_previous_text=False,
        no_speech_threshold=0.45,
        compression_ratio_threshold=2.4,
    )

    blocks: list[str] = []
    number = 1
    for segment in result.get("segments", []):
        text = " ".join(str(segment.get("text", "")).split()).strip()
        start = float(segment.get("start", 0))
        end = float(segment.get("end", 0))
        if not text or not math.isfinite(start) or not math.isfinite(end) or end <= start:
            continue
        blocks.append(f"{number}\n{timestamp(start)} --> {timestamp(end)}\n{text}")
        number += 1

    if not blocks:
        raise RuntimeError("没有识别到可用语音，请检查视频是否包含清晰人声。")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
