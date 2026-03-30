"""Page models — individual page content and metadata."""

from pydantic import BaseModel


class PageMeta(BaseModel):
    title: str | None = None
    description: str | None = None
    keywords: list[str] = []
    og_title: str | None = None
    og_description: str | None = None
    og_image: str | None = None
    canonical_url: str | None = None
    language: str | None = None
    robots: str | None = None


class ComponentContent(BaseModel):
    component_name: str
    component_index: int = 0  # order on page
    field_values: dict[str, str | list | dict] = {}
    variant: str | None = None
    raw_html: str | None = None


class PageContent(BaseModel):
    components: list[ComponentContent] = []
    media_urls: list[str] = []


class Page(BaseModel):
    url: str
    path: str  # URL path, e.g. /about-us
    slug: str  # filesystem-safe name
    page_type: str | None = None  # home, landing, article, product, etc.
    template_name: str | None = None  # detected page template
    meta: PageMeta = PageMeta()
    content: PageContent = PageContent()
    screenshot_path: str | None = None
    parent_path: str | None = None
    children: list[str] = []  # child page paths
    depth: int = 0


class PageTree(BaseModel):
    pages: list[Page] = []
    navigation_structure: dict = {}
    total_pages: int = 0
    unique_templates: list[str] = []
