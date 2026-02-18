# boards/linkmeta.py
import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en,en-GB;q=0.9"}


def _is_safe_url(url: str) -> bool:
    """Block requests to private/internal networks and non-HTTP schemes."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    if parsed.scheme not in ("http", "https"):
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    # Resolve hostname and check all IPs
    try:
        for info in socket.getaddrinfo(hostname, None):
            addr = info[4][0]
            ip = ipaddress.ip_address(addr)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
    except socket.gaierror:
        return False

    return True


def fetch_link_meta(url: str):
    if not _is_safe_url(url):
        return {"title": "", "description": "", "image": ""}

    try:
        r = requests.get(url, timeout=6, headers=UA, allow_redirects=True)
        if r.status_code != 200 or not r.text:
            return {"title": "", "description": "", "image": ""}
    except Exception:
        return {"title": "", "description": "", "image": ""}

    s = BeautifulSoup(r.text, "html.parser")

    def g(p, n):
        m = s.find("meta", attrs={p: n})
        return (m.get("content") or "").strip() if m else ""

    title = g("property", "og:title") or g("name", "twitter:title") or (s.title.string.strip() if s.title else "")
    desc = g("property", "og:description") or g("name", "description")
    img = g("property", "og:image") or g("name", "twitter:image")

    if img:
        if img.startswith("//"):
            img = "https:" + img
        elif img.startswith("/"):
            img = urljoin(url, img)

    return {"title": title, "description": desc, "image": img or ""}

def site_hostname(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""

def try_fetch_favicon_url(url: str) -> str | None:
    host = site_hostname(url)
    if not host:
        return None
    ico = f"https://{host}/favicon.ico"

    if not _is_safe_url(ico):
        return f"https://www.google.com/s2/favicons?domain={host}&sz=128"

    try:
        h = requests.head(ico, timeout=4, headers=UA, allow_redirects=True)
        if h.status_code == 200 and h.headers.get("content-type", "").startswith(("image/", "application/octet-stream")):
            return ico
    except Exception:
        pass
    return f"https://www.google.com/s2/favicons?domain={host}&sz=128"
