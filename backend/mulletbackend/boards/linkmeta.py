# boards/linkmeta.py
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0", "Accept-Language": "en,en-GB;q=0.9"}

def fetch_link_meta(url: str):
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
    try:
        h = requests.head(ico, timeout=4, headers=UA, allow_redirects=True)
        if h.status_code == 200 and h.headers.get("content-type", "").startswith(("image/", "application/octet-stream")):
            return ico
    except Exception:
        pass
    return f"https://www.google.com/s2/favicons?domain={host}&sz=128"
