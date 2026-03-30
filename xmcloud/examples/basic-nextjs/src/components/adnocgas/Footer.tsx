'use client';

/**
 * Footer — Site footer with logo, copyright, social links, link columns, bottom bar
 * Sitecore fields: LogoImage, Copyright, col1-5 x (Title, TitleLink, link1-4 x (Label, Link)), social1-3 x (Platform, Link), bottom1-4 x (Label, Link)
 * Template: Footer ({cf5cbea0f6ef463c9673e35fd200d451})
 * Rendering: Footer ({51986d617cb047aba3ee8bef43f95357})
 */

import type React from 'react';
import { type JSX } from 'react';
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

interface FooterParams {
  [key: string]: string;
}

export interface FooterFields {
  LogoImage?: ImageField;
  Copyright?: TextField;
  col1Title?: TextField;
  col1TitleLink?: LinkField;
  col1link1Label?: TextField;
  col1link1Link?: LinkField;
  col1link2Label?: TextField;
  col1link2Link?: LinkField;
  col1link3Label?: TextField;
  col1link3Link?: LinkField;
  col1link4Label?: TextField;
  col1link4Link?: LinkField;
  col2Title?: TextField;
  col2TitleLink?: LinkField;
  col2link1Label?: TextField;
  col2link1Link?: LinkField;
  col2link2Label?: TextField;
  col2link2Link?: LinkField;
  col2link3Label?: TextField;
  col2link3Link?: LinkField;
  col2link4Label?: TextField;
  col2link4Link?: LinkField;
  col3Title?: TextField;
  col3TitleLink?: LinkField;
  col3link1Label?: TextField;
  col3link1Link?: LinkField;
  col3link2Label?: TextField;
  col3link2Link?: LinkField;
  col3link3Label?: TextField;
  col3link3Link?: LinkField;
  col3link4Label?: TextField;
  col3link4Link?: LinkField;
  col4Title?: TextField;
  col4TitleLink?: LinkField;
  col4link1Label?: TextField;
  col4link1Link?: LinkField;
  col4link2Label?: TextField;
  col4link2Link?: LinkField;
  col4link3Label?: TextField;
  col4link3Link?: LinkField;
  col4link4Label?: TextField;
  col4link4Link?: LinkField;
  col5Title?: TextField;
  col5TitleLink?: LinkField;
  col5link1Label?: TextField;
  col5link1Link?: LinkField;
  col5link2Label?: TextField;
  col5link2Link?: LinkField;
  col5link3Label?: TextField;
  col5link3Link?: LinkField;
  col5link4Label?: TextField;
  col5link4Link?: LinkField;
  social1Platform?: TextField;
  social1Link?: LinkField;
  social2Platform?: TextField;
  social2Link?: LinkField;
  social3Platform?: TextField;
  social3Link?: LinkField;
  bottom1Label?: TextField;
  bottom1Link?: LinkField;
  bottom2Label?: TextField;
  bottom2Link?: LinkField;
  bottom3Label?: TextField;
  bottom3Link?: LinkField;
  bottom4Label?: TextField;
  bottom4Link?: LinkField;
}

export interface FooterProps extends ComponentProps {
  params: FooterParams;
  fields: FooterFields;
  isPageEditing?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const SocialIcon = ({ platform }: { platform: string }) => {
  if (platform === 'linkedin') return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
  if (platform === 'x') return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
  if (platform === 'instagram') return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>;
  return null;
};

// ─── Default Variant ────────────────────────────────────────────────────────────

const FooterDefault = (
  props: FooterProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component footer" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Footer</span>
        </div>
      </section>
    );
  }

  const columns = [1, 2, 3, 4, 5].map((n) => {
    const prefix = `col${n}` as const;
    const links = [1, 2, 3, 4].map((l) => ({
      label: (fields as Record<string, unknown>)[`${prefix}link${l}Label`] as TextField | undefined,
      link: (fields as Record<string, unknown>)[`${prefix}link${l}Link`] as LinkField | undefined,
    })).filter((lk) => lk.label?.value);
    return {
      title: (fields as Record<string, unknown>)[`${prefix}Title`] as TextField | undefined,
      titleLink: (fields as Record<string, unknown>)[`${prefix}TitleLink`] as LinkField | undefined,
      links,
    };
  }).filter((c) => c.title?.value || isPageEditing);

  const socials = [1, 2, 3].map((n) => ({
    platform: (fields as Record<string, unknown>)[`social${n}Platform`] as TextField | undefined,
    link: (fields as Record<string, unknown>)[`social${n}Link`] as LinkField | undefined,
  })).filter((s) => s.platform?.value);

  const bottomLinks = [1, 2, 3, 4].map((n) => ({
    label: (fields as Record<string, unknown>)[`bottom${n}Label`] as TextField | undefined,
    link: (fields as Record<string, unknown>)[`bottom${n}Link`] as LinkField | undefined,
  })).filter((b) => b.label?.value);

  return (
    <footer data-component="Footer" id={id ? id : undefined} className="site-footer w-full bg-[#646b6d] text-white font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px] py-[40px] md:py-[48px] lg:py-[56px]">
        <div className="flex flex-col lg:flex-row gap-[32px] lg:gap-[40px]">
          {/* Left column: logo + copyright + social */}
          <div className="shrink-0 lg:w-[160px]">
            {(fields.LogoImage?.value?.src || isPageEditing) && (
              <a href="/" className="block mb-[16px]">
                <ContentSdkImage
                  field={{
                    ...fields.LogoImage,
                    value: {
                      ...fields.LogoImage?.value,
                      style: { height: '40px', width: 'auto' },
                    },
                  }}
                />
              </a>
            )}
            {(fields.Copyright?.value || isPageEditing) && (
              <Text field={fields.Copyright} tag="p" className="text-[14px] font-[400] leading-[21px] text-white/70 mb-[24px]" />
            )}
            {socials.length > 0 && (
              <div className="flex gap-[12px]">
                {socials.map((social, i) => (
                  <a
                    key={i}
                    href={String(social.link?.value?.href || '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-[32px] h-[32px] rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-[#646b6d] transition-all duration-300"
                    aria-label={String(social.platform?.value || '')}
                  >
                    <SocialIcon platform={String(social.platform?.value || '')} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[24px] lg:gap-[32px]">
            {columns.map((col, i) => (
              <div key={i}>
                {(col.title?.value || isPageEditing) && (
                  <h5 className="text-[16px] font-[700] leading-[24px] text-white mb-[12px]">
                    {isPageEditing ? (
                      <Text field={col.title} tag="span" />
                    ) : (
                      <a href={String(col.titleLink?.value?.href || '#')} className="hover:text-[#00bfb2] transition-colors duration-200">
                        {String(col.title?.value || '')}
                      </a>
                    )}
                  </h5>
                )}
                {col.links.length > 0 && (
                  <ul className="space-y-[8px]">
                    {col.links.map((lk, j) => (
                      <li key={j}>
                        {isPageEditing ? (
                          <Text field={lk.label} tag="span" className="text-[14px] font-[400] leading-[21px] text-white/70" />
                        ) : (
                          <a href={String(lk.link?.value?.href || '#')} className="text-[14px] font-[400] leading-[21px] text-white/70 hover:text-white transition-colors duration-200">
                            {String(lk.label?.value || '')}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      {bottomLinks.length > 0 && (
        <div className="w-full border-t border-white/20">
          <div className="max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px] py-[16px] flex flex-wrap items-center justify-center gap-[16px]">
            {bottomLinks.map((bl, i) => (
              isPageEditing ? (
                <Text key={i} field={bl.label} tag="span" className="text-[14px] font-[400] leading-[21px] text-white/50" />
              ) : (
                <a key={i} href={String(bl.link?.value?.href || '#')} className="text-[14px] font-[400] leading-[21px] text-white/50 hover:text-white transition-colors duration-200">
                  {String(bl.label?.value || '')}
                </a>
              )
            ))}
          </div>
        </div>
      )}
    </footer>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<FooterProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <FooterDefault {...props} isPageEditing={isEditing} />;
};
