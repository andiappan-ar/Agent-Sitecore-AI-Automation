"""Component models — detected UI components with Sitecore field mappings."""

from pydantic import BaseModel
from scrapper.models.sitecore import SitecoreTemplate, SitecorePlaceholder


class ComponentField(BaseModel):
    name: str
    html_selector: str
    html_attribute: str | None = None  # e.g. "src", "href", "textContent"
    sitecore_field_type: str
    sample_value: str | None = None


class ComponentVariant(BaseModel):
    name: str
    distinguishing_classes: list[str] = []
    distinguishing_attributes: dict[str, str] = {}
    screenshot_path: str | None = None
    description: str | None = None


class Component(BaseModel):
    name: str
    category: str | None = None  # hero, navigation, card, footer, form, etc.
    html_tag: str | None = None
    css_selector: str
    fields: list[ComponentField] = []
    variants: list[ComponentVariant] = []
    sitecore_template: SitecoreTemplate | None = None
    placeholders: list[SitecorePlaceholder] = []
    sample_html: str | None = None
    screenshot_path: str | None = None
    pages_found_on: list[str] = []
    is_dynamic: bool = False
    confidence: float = 1.0  # 0-1, how confident we are in detection
    notes: str | None = None


class ComponentLibrary(BaseModel):
    components: list[Component] = []
    unknown_elements: list[dict] = []  # things we couldn't classify
    total_pages_analyzed: int = 0
    detection_method: str = "dom-pattern-analysis"
