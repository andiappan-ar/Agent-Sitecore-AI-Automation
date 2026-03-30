"""Design system models — fonts, colors, spacing, breakpoints."""

from pydantic import BaseModel


class ColorToken(BaseModel):
    name: str
    hex_value: str
    rgb: str | None = None
    usage: str | None = None  # e.g. "primary", "background", "text"
    css_variable: str | None = None
    occurrences: int = 0


class FontDefinition(BaseModel):
    family: str
    weights: list[str] = []
    styles: list[str] = []  # normal, italic
    source_url: str | None = None
    local_path: str | None = None
    format: str | None = None  # woff2, woff, ttf
    is_primary: bool = False


class SpacingToken(BaseModel):
    name: str
    value: str  # e.g. "8px", "1rem"
    usage: str | None = None


class BreakpointToken(BaseModel):
    name: str  # e.g. "mobile", "tablet", "desktop"
    min_width: str | None = None
    max_width: str | None = None


class DesignToken(BaseModel):
    css_variable: str
    value: str
    category: str | None = None  # color, spacing, font, etc.


class DesignSystem(BaseModel):
    colors: list[ColorToken] = []
    fonts: list[FontDefinition] = []
    spacing: list[SpacingToken] = []
    breakpoints: list[BreakpointToken] = []
    css_variables: list[DesignToken] = []
    raw_stylesheets: list[str] = []  # URLs of stylesheets analyzed
