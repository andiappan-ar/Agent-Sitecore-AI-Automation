'use client';

/**
 * Header — Fixed transparent header with utility bar, navigation, stock ticker, mobile menu
 * All text fields use Content SDK <Text> for inline editing in Page Builder.
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

interface HeaderParams { [key: string]: string; }

export interface HeaderFields {
  Logo?: ImageField;
  Heading?: TextField;
  Description?: TextField;
  nav1Label?: TextField; nav1Link?: LinkField;
  nav2Label?: TextField; nav2Link?: LinkField;
  nav3Label?: TextField; nav3Link?: LinkField;
  nav4Label?: TextField; nav4Link?: LinkField;
  nav5Label?: TextField; nav5Link?: LinkField;
  nav6Label?: TextField; nav6Link?: LinkField;
  nav7Label?: TextField; nav7Link?: LinkField;
  util1Label?: TextField; util1Link?: LinkField;
  util2Label?: TextField; util2Link?: LinkField;
  util3Label?: TextField; util3Link?: LinkField;
  LanguageLabel?: TextField; LanguageLink?: LinkField;
}

export interface HeaderProps extends ComponentProps {
  params: HeaderParams;
  fields: HeaderFields;
  isPageEditing?: boolean;
}

// ─── Nav item renderer (editable Text inside link) ──────────────────────────────

function NavLink({ label, link, isEditing, className }: {
  label?: TextField; link?: LinkField; isEditing?: boolean; className: string;
}) {
  if (!label?.value && !isEditing) return null;
  const href = String(link?.value?.href || '#');

  if (isEditing) {
    return <Text field={label} tag="span" className={className} />;
  }
  return (
    <a href={href} className={className + ' hover:opacity-80 transition-opacity'}>
      <Text field={label} tag="span" />
    </a>
  );
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const HeaderDefault = (
  props: HeaderProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [menuOpen, setMenuOpen] = useState(false);

  if (!fields) {
    return (
      <header className="component header" id={id}>
        <div className="component-content"><span className="is-empty-hint">Header</span></div>
      </header>
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
  ].filter(n => n.label?.value || isPageEditing);

  const utilLinks = [
    { label: fields.util1Label, link: fields.util1Link },
    { label: fields.util2Label, link: fields.util2Link },
    { label: fields.util3Label, link: fields.util3Link },
  ].filter(u => u.label?.value || isPageEditing);

  // Logo URL — rewrite hostname for local dev, fallback to external
  const rawLogoSrc = fields.Logo?.value?.src || '';
  const logoSrc = rawLogoSrc
    ? rawLogoSrc.replace(/https?:\/\/adnocgas\.localhost/, 'https://xmcloudcm.localhost')
    : 'https://www.adnocgas.ae/-/media/gas/logo/listed-company-logos---website_white_adnoc-gas-vertical.ashx';

  return (
    <header
      data-component="Header"
      id={id ? id : undefined}
      className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent font-['ADNOC_Sans',sans-serif] text-[16px] font-[400] leading-[24px]"
    >
      {/* ═══ DESKTOP HEADER ═══ */}
      <div className="hidden lg:block w-full">
        <div className="max-w-[1400px] mx-auto px-[7.5px]">
          <div className="flex flex-row justify-between items-start py-[25px]">
            {/* Logo — editable via Content SDK Image */}
            <a href="/en" className="shrink-0 w-[140px] py-[3.125px] mr-[40px]">
              {(fields.Logo?.value?.src || isPageEditing) ? (
                <ContentSdkImage
                  field={{
                    ...fields.Logo,
                    value: {
                      ...fields.Logo?.value,
                      src: logoSrc,
                      style: { width: '140px', height: 'auto' },
                    },
                  }}
                />
              ) : (
                <Text field={fields.Heading} tag="div" className="text-white text-[20px] font-[700]" />
              )}
            </a>

            {/* Right side: utility bar + nav */}
            <div className="relative flex-1">
              {/* Utility bar */}
              <div className="relative w-full" style={{ borderBottom: '1px solid rgb(255, 255, 255)' }}>
                <ul className="flex flex-row justify-end items-center h-[34px] ml-[20px]">
                  {utilLinks.map((u, i) => (
                    <li key={i} className="mr-[40px] mb-[10px]">
                      <NavLink label={u.label} link={u.link} isEditing={isPageEditing} className="text-white text-[14px] leading-[21px]" />
                    </li>
                  ))}
                  {(fields.LanguageLabel?.value || isPageEditing) && (
                    <li className="mr-[40px] mb-[10px]">
                      <NavLink label={fields.LanguageLabel} link={fields.LanguageLink} isEditing={isPageEditing} className="text-white text-[14px] leading-[21px]" />
                    </li>
                  )}
                  {/* Search icon */}
                  <li className="mb-[10px]">
                    <button className="text-white" aria-label="Search">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242 1.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" fill="currentColor"/>
                      </svg>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Main navigation */}
              <nav className="flex flex-row flex-wrap justify-end items-center w-full h-[64px]">
                <div className="w-full py-[20px]">
                  <ul className="flex flex-row justify-between items-start w-full">
                    {navItems.map((item, i) => (
                      <li key={i} className="relative group">
                        <NavLink label={item.label} link={item.link} isEditing={isPageEditing} className="text-white font-[800] text-[16px] leading-[24px] whitespace-nowrap" />
                      </li>
                    ))}
                    {/* Stock ticker */}
                    <li className="relative top-[-8px]">
                      <StockTicker />
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MOBILE HEADER ═══ */}
      <div className="lg:hidden w-full">
        <div className="flex flex-row items-center justify-between bg-white h-[76px] max-h-[76px] py-[8px] px-[7.5px]">
          <a href="/en" className="shrink-0 py-[3.125px] mr-[10px]">
            {(fields.Logo?.value?.src || isPageEditing) ? (
              <ContentSdkImage
                field={{
                  ...fields.Logo,
                  value: {
                    ...fields.Logo?.value,
                    src: logoSrc,
                    style: { width: '100px', height: 'auto', filter: 'brightness(0) saturate(100%) invert(30%) sepia(6%) saturate(547%) hue-rotate(169deg) brightness(95%) contrast(91%)' },
                  },
                }}
              />
            ) : (
              <Text field={fields.Heading} tag="div" className="text-[#505557] text-[16px] font-[700]" />
            )}
          </a>

          <div className="flex flex-row justify-end items-center">
            {(fields.LanguageLabel?.value) && (
              <a href={String(fields.LanguageLink?.value?.href || '/ar')} className="text-[#54565a] text-[16px] mr-[8px]">
                <Text field={fields.LanguageLabel} tag="span" />
              </a>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative w-[55px] h-[55px] p-[10px] bg-[#006681] flex items-center justify-center"
              aria-label="Menu"
            >
              <div className="relative w-[20px] h-[16px]">
                <span className={`absolute left-0 w-full h-[2px] bg-white transition-all duration-300 ${menuOpen ? 'top-[7px] rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 w-full h-[2px] bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : 'top-[7px]'}`} />
                <span className={`absolute left-0 w-full h-[2px] bg-white transition-all duration-300 ${menuOpen ? 'top-[7px] -rotate-45' : 'top-[14px]'}`} />
              </div>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="absolute top-[76px] left-0 right-0 w-full bg-[#006681] text-white overflow-y-auto" style={{ height: 'calc(100vh - 76px)' }}>
            <div className="px-[7.5px]">
              <div className="w-full">
                <div className="w-full text-right py-[8px]">
                  <button onClick={() => setMenuOpen(false)} className="p-[8px] text-white" aria-label="Close menu">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <ul className="w-full">
                  <li className="py-[13px]" style={{ borderBottom: '1px solid rgb(196, 196, 196)' }}>
                    <StockTicker />
                  </li>
                  <MobileNavItem label="Home" href="/en" />
                  {navItems.map((item, i) => (
                    <MobileNavItem key={i} label={String(item.label?.value || '')} href={String(item.link?.value?.href || '#')} />
                  ))}
                  {utilLinks.map((u, i) => (
                    <MobileNavItem key={'u' + i} label={String(u.label?.value || '')} href={String(u.link?.value?.href || '#')} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MobileNavItem({ label, href }: { label: string; href: string }) {
  return (
    <li className="py-[13px]" style={{ borderBottom: '1px solid rgb(196, 196, 196)' }}>
      <a href={href} className="text-white text-[16px] font-[800] leading-[20px]">{label}</a>
    </li>
  );
}

function StockTicker() {
  const stockData = [
    { label: 'Last', value: '—' },
    { label: 'Change', value: '—' },
    { label: '% Change', value: '—' },
    { label: 'Open', value: '—' },
    { label: 'High', value: '—' },
    { label: 'Low', value: '—' },
    { label: 'Volume', value: '—' },
  ];
  return (
    <div className="absolute top-0 right-0 w-[204px] min-w-[204px] py-[12px] px-[14px] bg-[#008cb1] text-white">
      <div className="mb-[10px]">
        <div className="text-[14px] font-[700] leading-[21px]">ADX: ADNOCGAS</div>
        <div className="text-[12px] leading-[18px]">{'—'}</div>
      </div>
      <ul className="text-[rgba(255,255,255,0.85)]">
        {stockData.map((row, i) => (
          <li key={i} className="flex flex-row justify-between py-[3px] text-[10px] leading-[15px]" style={{ borderBottom: '1px solid rgb(255, 255, 255)' }}>
            <span>{row.label}</span><span>{row.value}</span>
          </li>
        ))}
      </ul>
      <div className="pt-[8px]"><div className="text-[10px] leading-[15px]">Data delayed at least 15 minutes</div></div>
    </div>
  );
}

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeaderProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeaderDefault {...props} isPageEditing={isEditing} />;
};
