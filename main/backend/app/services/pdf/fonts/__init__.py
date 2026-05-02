"""Japanese font registration for reportlab.

Strategy:
  1) ./*.ttf (IPAexGothic.ttf 等) があればそれを TTFont として登録
  2) なければ reportlab 標準の CID 内蔵フォント "HeiseiKakuGo-W5" を使用
     (UnicodeCIDFont — Acrobat / Preview 互換)
"""
from __future__ import annotations

import os
from pathlib import Path
from threading import Lock

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont


_FONTS_DIR = Path(__file__).parent
_REGISTRY_LOCK = Lock()
_REGISTERED: str | None = None


def get_jp_font() -> str:
    """Register and return the Japanese font name."""
    global _REGISTERED
    with _REGISTRY_LOCK:
        if _REGISTERED is not None:
            return _REGISTERED

        # 1) ローカル TTF があれば優先
        for fname in ("IPAexGothic.ttf", "ipaexg.ttf", "NotoSansJP-Regular.ttf"):
            fp = _FONTS_DIR / fname
            if fp.exists():
                try:
                    pdfmetrics.registerFont(TTFont("AentroJP", str(fp)))
                    _REGISTERED = "AentroJP"
                    return _REGISTERED
                except Exception:
                    continue

        # 2) システムフォント (macOS / Linux)
        candidates = [
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
            "/Library/Fonts/Arial Unicode.ttf",
            "/usr/share/fonts/truetype/ipafont-gothic/ipag.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        ]
        for path in candidates:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont("AentroJP", path))
                    _REGISTERED = "AentroJP"
                    return _REGISTERED
                except Exception:
                    continue

        # 3) 最終フォールバック: 内蔵 CID
        try:
            pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
            _REGISTERED = "HeiseiKakuGo-W5"
            return _REGISTERED
        except Exception:
            _REGISTERED = "Helvetica"
            return _REGISTERED
