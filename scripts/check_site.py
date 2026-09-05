"""Small dependency-free audit for the static website."""

from __future__ import annotations

import json
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
QR_DESTINATION = "https://meisamjam.github.io/supervision.html"
PAGES = [
    "index.html",
    "research.html",
    "publications.html",
    "projects.html",
    "supervision.html",
    "contact.html",
    "404.html",
]


class PageAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[str] = []
        self.assets: list[str] = []
        self.h1_count = 0
        self.title_count = 0
        self.images_without_alt = 0
        self.external_targets_without_rel = 0
        self.controls: set[str] = set()
        self.labels: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag == "h1":
            self.h1_count += 1
        elif tag == "title":
            self.title_count += 1
        elif tag == "a" and values.get("href"):
            self.links.append(values["href"] or "")
            if values.get("target") == "_blank" and "noopener" not in (values.get("rel") or ""):
                self.external_targets_without_rel += 1
        elif tag in {"script", "img"} and values.get("src"):
            self.assets.append(values["src"] or "")
        elif tag == "link" and values.get("href"):
            self.assets.append(values["href"] or "")

        if tag == "img" and not (values.get("alt") or "").strip():
            self.images_without_alt += 1
        if tag in {"input", "select", "textarea"} and values.get("id"):
            self.controls.add(values["id"] or "")
        if tag == "label" and values.get("for"):
            self.labels.add(values["for"] or "")


def local_target(value: str) -> Path | None:
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc or value.startswith(("#", "mailto:", "tel:")):
        return None
    relative = unquote(parsed.path)
    if not relative:
        return None
    return ROOT / relative


def assigned_json(path: Path) -> object:
    text = path.read_text(encoding="utf-8").strip()
    payload = text.split("=", 1)[1].strip().removesuffix(";")
    return json.loads(payload)


def main() -> int:
    errors: list[str] = []
    for page_name in PAGES:
        page = ROOT / page_name
        audit = PageAudit()
        audit.feed(page.read_text(encoding="utf-8"))

        if audit.title_count != 1:
            errors.append(f"{page_name}: expected one <title>, found {audit.title_count}")
        if audit.h1_count != 1:
            errors.append(f"{page_name}: expected one <h1>, found {audit.h1_count}")
        for item, count in Counter(audit.ids).items():
            if count > 1:
                errors.append(f"{page_name}: duplicate id '{item}'")
        if audit.images_without_alt:
            errors.append(f"{page_name}: {audit.images_without_alt} image(s) have no alt text")
        if audit.external_targets_without_rel:
            errors.append(f"{page_name}: target=_blank link missing rel=noopener")
        for control in sorted(audit.controls - audit.labels):
            errors.append(f"{page_name}: control '{control}' has no associated label")
        for value in audit.links + audit.assets:
            target = local_target(value)
            if target is not None and not target.exists():
                errors.append(f"{page_name}: missing local target '{value}'")

    site_data = assigned_json(ROOT / "assets/js/data.js")
    profile = assigned_json(ROOT / "assets/data/profile.js")
    if not isinstance(site_data, dict) or not site_data.get("publications"):
        errors.append("assets/js/data.js: publications are missing")
    if not isinstance(profile, dict) or not profile.get("email"):
        errors.append("assets/data/profile.js: profile email is missing")

    qr_source = (ROOT / "assets/img/thesis-projects-qr.svg").read_text(encoding="utf-8")
    if QR_DESTINATION not in qr_source:
        errors.append("QR asset: permanent supervision destination changed")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    if QR_DESTINATION not in sitemap:
        errors.append("sitemap.xml: permanent QR destination is missing")

    if errors:
        print("Site audit failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1

    print(f"Site audit passed: {len(PAGES)} pages, all local links and structured data valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
