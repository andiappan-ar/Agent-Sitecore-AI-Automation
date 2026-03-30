"""Site-level models — discovery, configuration, and overall output."""

from pydantic import BaseModel
from scrapper.models.design import DesignSystem
from scrapper.models.component import ComponentLibrary
from scrapper.models.page import PageTree


class RobotsInfo(BaseModel):
    raw_content: str | None = None
    sitemaps: list[str] = []
    disallowed_paths: list[str] = []
    allowed_paths: list[str] = []
    crawl_delay: float | None = None


class SitemapInfo(BaseModel):
    url: str
    urls_found: list[str] = []
    total_urls: int = 0


class SiteDiscovery(BaseModel):
    base_url: str
    domain: str
    robots: RobotsInfo = RobotsInfo()
    sitemaps: list[SitemapInfo] = []
    discovered_urls: list[str] = []
    unique_page_types: list[str] = []
    total_pages: int = 0


class MediaAsset(BaseModel):
    url: str
    local_path: str | None = None
    asset_type: str  # image, video, document, font, icon
    alt_text: str | None = None
    used_on_pages: list[str] = []
    file_size: int | None = None


class TodoItem(BaseModel):
    description: str
    component_name: str | None = None
    page_url: str | None = None
    category: str = "unknown"  # unknown-component, dynamic-content, review-needed
    priority: str = "medium"


class SiteConfig(BaseModel):
    """Per-site scraper configuration — generated dynamically."""
    base_url: str
    domain: str
    max_pages: int = 100
    respect_robots: bool = True
    javascript_rendering: bool = True
    screenshot_pages: bool = True
    screenshot_components: bool = True
    custom_selectors: dict[str, str] = {}  # site-specific component selectors
    ignore_paths: list[str] = []
    rate_limit_ms: int = 1000


class SiteOutput(BaseModel):
    """Complete output for a scraped site."""
    config: SiteConfig
    discovery: SiteDiscovery
    design_system: DesignSystem
    component_library: ComponentLibrary
    page_tree: PageTree
    media_assets: list[MediaAsset] = []
    todos: list[TodoItem] = []
