#!/usr/bin/env python3
"""心 · 夜游 —— 本地服务器：静态页面 + 相册图库。

相册不再只存在浏览器里，而是落到本文件夹的 photo-library/：
  photo-library/index.json     照片清单（名字、时间、文件名）
  photo-library/<id>.<ext>     原图

把整个文件夹拷到别的设备，换个浏览器打开，按名字搜索依然能找得到。

接口（只监听 127.0.0.1）：
  GET    /api/photos          取照片清单
  POST   /api/photos          上传（请求体是图片原始字节，X-Photo-Name 放名字）
  DELETE /api/photos/<id>     删除一张
"""

import json
import mimetypes
import os
import time
import threading
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
LIB_DIR = os.path.join(ROOT, "photo-library")
INDEX_FILE = os.path.join(LIB_DIR, "index.json")
API_PATH = "/api/photos"
MAX_BYTES = 24 * 1024 * 1024
PORT = int(os.environ.get("STAR_ISLE_PORT", "8899"))

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/avif": ".avif",
}

_lock = threading.Lock()


def read_index():
    try:
        with open(INDEX_FILE, "r", encoding="utf-8") as fp:
            data = json.load(fp)
    except (OSError, ValueError):
        return []
    photos = data.get("photos") if isinstance(data, dict) else data
    return photos if isinstance(photos, list) else []


def write_index(photos):
    os.makedirs(LIB_DIR, exist_ok=True)
    tmp = INDEX_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fp:
        json.dump({"photos": photos}, fp, ensure_ascii=False, indent=2)
    os.replace(tmp, INDEX_FILE)


def public_entry(entry):
    return {
        "id": entry.get("id", ""),
        "name": entry.get("name", ""),
        "createdAt": entry.get("createdAt", 0),
        "type": entry.get("type", ""),
        "size": entry.get("size", 0),
        "url": "photo-library/" + entry.get("file", ""),
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):  # 控制台保持安静
        pass

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def api_path(self):
        return self.path.split("?")[0].rstrip("/")

    def do_GET(self):
        if self.api_path() == API_PATH:
            with _lock:
                photos = read_index()
            photos.sort(key=lambda p: p.get("createdAt", 0), reverse=True)
            self.send_json({"ok": True, "photos": [public_entry(p) for p in photos]})
            return
        super().do_GET()

    def do_POST(self):
        if self.api_path() != API_PATH:
            self.send_json({"ok": False, "error": "not-found"}, 404)
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            self.send_json({"ok": False, "error": "empty"}, 400)
            return
        if length > MAX_BYTES:
            self.send_json({"ok": False, "error": "too-large"}, 413)
            return

        name = unquote(self.headers.get("X-Photo-Name") or "").strip()[:40]
        if not name:
            self.send_json({"ok": False, "error": "no-name"}, 400)
            return

        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        ext = ALLOWED_TYPES.get(ctype)
        if not ext:
            self.send_json({"ok": False, "error": "not-image"}, 415)
            return

        data = self.rfile.read(length)
        if not data:
            self.send_json({"ok": False, "error": "empty"}, 400)
            return

        with _lock:
            photos = read_index()
            if any(p.get("name", "").strip().lower() == name.lower() for p in photos):
                self.send_json({"ok": False, "error": "duplicate"}, 409)
                return
            pid = uuid.uuid4().hex
            filename = pid + ext
            os.makedirs(LIB_DIR, exist_ok=True)
            with open(os.path.join(LIB_DIR, filename), "wb") as fp:
                fp.write(data)
            entry = {
                "id": pid,
                "name": name,
                "file": filename,
                "type": ctype,
                "size": len(data),
                "createdAt": int(time.time() * 1000),
            }
            photos.append(entry)
            write_index(photos)

        self.send_json({"ok": True, "photo": public_entry(entry)}, 201)

    def do_DELETE(self):
        path = self.api_path()
        if not path.startswith(API_PATH + "/"):
            self.send_json({"ok": False, "error": "not-found"}, 404)
            return
        pid = unquote(path[len(API_PATH) + 1:])

        with _lock:
            photos = read_index()
            target = next((p for p in photos if p.get("id") == pid), None)
            if target is None:
                self.send_json({"ok": False, "error": "missing"}, 404)
                return
            write_index([p for p in photos if p.get("id") != pid])

        try:
            os.remove(os.path.join(LIB_DIR, os.path.basename(target.get("file", ""))))
        except OSError:
            pass
        self.send_json({"ok": True})


def main():
    os.makedirs(LIB_DIR, exist_ok=True)
    mimetypes.add_type("audio/mp4", ".m4a")
    mimetypes.add_type("image/webp", ".webp")
    mimetypes.add_type("model/gltf-binary", ".glb")

    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print("[star-isle] port %d is busy - close the old server window first." % PORT)
        return

    print("[star-isle] http://127.0.0.1:%d/index.html" % PORT)
    print("[star-isle] album library: photo-library\\")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
