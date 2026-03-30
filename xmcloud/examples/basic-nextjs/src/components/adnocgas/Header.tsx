'use client';

/**
 * Header — Site header with utility bar, main navigation, and mobile menu
 * Sitecore fields: Logo, Heading, Description, nav1-7 x (Label, Link), util1-3 x (Label, Link), LanguageLabel, LanguageLink
 * Template: Header ({a08f7dba7c3f4893818e9e75ee073359})
 * Rendering: Header ({fbd7f2aed0b246a591740e30da28c985})
 */

import type React from 'react';
import { type JSX } from 'react';
import { useState } from 'react';
import {
  NextImage as ContentSdkImage,
  ImageField,
  Text,
  TextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface HeaderParams {
  [key: string]: string;
}

export interface HeaderFields {
  Logo?: ImageField;
  Heading?: TextField;
  Description?: TextField;
  nav1Label?: TextField;
  nav1Link?: LinkField;
  nav2Label?: TextField;
  nav2Link?: LinkField;
  nav3Label?: TextField;
  nav3Link?: LinkField;
  nav4Label?: TextField;
  nav4Link?: LinkField;
  nav5Label?: TextField;
  nav5Link?: LinkField;
  nav6Label?: TextField;
  nav6Link?: LinkField;
  nav7Label?: TextField;
  nav7Link?: LinkField;
  util1Label?: TextField;
  util1Link?: LinkField;
  util2Label?: TextField;
  util2Link?: LinkField;
  util3Label?: TextField;
  util3Link?: LinkField;
  LanguageLabel?: TextField;
  LanguageLink?: LinkField;
}

export interface HeaderProps extends ComponentProps {
  params: HeaderParams;
  fields: HeaderFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const HeaderDefault = (
  props: HeaderProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  if (!fields) {
    return (
      <section className="component header" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Header</span>
        </div>
      </section>
    );
  }

  const navItems = [
    { label: fields.nav1Label, link: fields.nav1Link },
    { label: fields.nav2Label, link: fields.nav2Link },
    { label: fields.nav3Label, link: fields.nav3Link },
    { label: fields.nav4Label, link: fields.nav4Link },
    { label: fields.nav5Label, link: fields.nav5Link },
    { label: fields.nav6Label, link: fields.nav6Link },
    { label: fields.nav7Label, link: fields.nav7Link },
  ].filter((n) => n.label?.value);

  const utilLinks = [
    { label: fields.util1Label, link: fields.util1Link },
    { label: fields.util2Label, link: fields.util2Link },
    { label: fields.util3Label, link: fields.util3Link },
  ].filter((u) => u.label?.value);

  return (
    <header data-component="Header" id={id ? id : undefined} className="site-header fixed top-0 inset-x-0 z-50 font-['ADNOC_Sans',sans-serif]">
      {/* Utility bar */}
      <div className="w-full hidden lg:block" style={{ backgroundColor: 'rgba(0,26,112,0.85)' }}>
        <div className="max-w-[1400px] mx-auto px-[8px] flex items-center justify-end gap-[24px] py-[8px]">
          {utilLinks.map((u, i) => (
            isPageEditing ? (
              <Text key={i} field={u.label} tag="span" className="text-[14px] font-[400] leading-[21px] text-white" />
            ) : (
              <a key={i} href={String(u.link?.value?.href || '#')} className="text-[14px] font-[400] leading-[21px] text-white hover:text-[#00bfb2] transition-colors duration-200">
                {String(u.label?.value || '')}
              </a>
            )
          ))}
          {(fields.LanguageLabel?.value || isPageEditing) && (
            isPageEditing ? (
              <Text field={fields.LanguageLabel} tag="span" className="text-[14px] font-[400] leading-[21px] text-white" />
            ) : (
              <a href={String(fields.LanguageLink?.value?.href || '#')} className="text-[14px] font-[400] leading-[21px] text-white hover:text-[#00bfb2] transition-colors duration-200">
                {String(fields.LanguageLabel?.value || '')}
              </a>
            )
          )}
        </div>
      </div>

      {/* Main nav bar */}
      <div className="w-full" style={{ backgroundColor: 'rgba(0,26,112,0.9)' }}>
        <div className="max-w-[1400px] mx-auto px-[8px] flex items-center justify-between py-[12px] lg:py-[16px]">
          {/* Logo */}
          <a href="/" className="shrink-0">
            {(fields.Logo?.value?.src || isPageEditing) ? (
              <ContentSdkImage
                field={{
                  ...fields.Logo,
                  value: {
                    ...fields.Logo?.value,
                    style: { height: '64px', width: 'auto' },
                  },
                }}
              />
            ) : (
              <div className="text-white text-[20px] font-[700]">ADNOC Gas</div>
            )}
          </a>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-[28px]">
            {navItems.map((item, i) => (
              <div
                key={i}
                className="relative"
                onMouseEnter={() => setOpenDropdown(i)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {isPageEditing ? (
                  <Text field={item.label} tag="span" className="text-[16px] font-[700] leading-[24px] text-white uppercase tracking-wide py-[20px] inline-block" />
                ) : (
                  <a
                    href={String(item.link?.value?.href || '#')}
                    className="text-[16px] font-[700] leading-[24px] text-white hover:text-[#00bfb2] transition-colors duration-200 uppercase tracking-wide py-[20px] inline-block"
                  >
                    {String(item.label?.value || '')}
                  </a>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden flex items-center justify-center w-[40px] h-[40px] text-white"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm0 6a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1z" fill="currentColor" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white shadow-lg max-h-[80vh] overflow-y-auto">
          <nav className="flex flex-col">
            {utilLinks.map((u, i) => (
              <a key={'u' + i} href={String(u.link?.value?.href || '#')} className="block px-[24px] py-[12px] text-[14px] font-[400] text-[#505557] border-b border-gray-100">
                {String(u.label?.value || '')}
              </a>
            ))}
            {navItems.map((item, i) => (
              <a key={i} href={String(item.link?.value?.href || '#')} className="block px-[24px] py-[14px] text-[16px] font-[700] text-[#001a70] border-b border-gray-100 hover:bg-gray-50">
                {String(item.label?.value || '')}
              </a>
            ))}
            {fields.LanguageLabel?.value && (
              <a href={String(fields.LanguageLink?.value?.href || '#')} className="block px-[24px] py-[14px] text-[16px] font-[700] text-[#001a70] border-b border-gray-100">
                {String(fields.LanguageLabel?.value || '')}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeaderProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeaderDefault {...props} isPageEditing={isEditing} />;
};
