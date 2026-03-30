"""Sitecore XM Cloud field and template models."""

from enum import Enum
from pydantic import BaseModel


class SitecoreFieldType(str, Enum):
    SINGLE_LINE_TEXT = "SingleLineText"
    MULTI_LINE_TEXT = "MultiLineText"
    RICH_TEXT = "RichText"
    IMAGE = "Image"
    GENERAL_LINK = "GeneralLink"
    FILE = "File"
    CHECKBOX = "Checkbox"
    DATE_TIME = "DateTime"
    NUMBER = "Number"
    DROPLINK = "Droplink"
    MULTILIST = "Multilist"
    INTERNAL_LINK = "InternalLink"
    NAME_VALUE_LIST = "NameValueList"


class SitecoreField(BaseModel):
    name: str
    field_type: SitecoreFieldType
    source_selector: str | None = None
    source_attribute: str | None = None
    is_required: bool = False
    default_value: str | None = None
    help_text: str | None = None


class SitecoreTemplate(BaseModel):
    template_name: str
    base_templates: list[str] = []
    fields: list[SitecoreField] = []
    icon: str | None = None
    display_name: str | None = None


class SitecorePlaceholder(BaseModel):
    name: str
    display_name: str | None = None
    allowed_renderings: list[str] = []


class SitecoreRendering(BaseModel):
    rendering_name: str
    template: SitecoreTemplate
    placeholders: list[SitecorePlaceholder] = []
    datasource_location: str | None = None
    datasource_template: str | None = None
