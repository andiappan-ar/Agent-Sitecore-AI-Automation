'use client';

/**
 * Footer — Multi-column footer with logo, copyright, link columns, social icons, and privacy
 * Uses numbered flat fields for column headings and links (similar to Header nav pattern).
 * Template: Footer ({cf5cbea0-f6ef-463c-9673-e35fd200d451})
 *   - Logo      (Image)
 *   - Heading   (Single-Line Text)
 *   - Description (Rich Text)
 *   - Copyright (Single-Line Text)
 * Rendering: Footer ({51986d61-7cb0-47ab-a3ee-8bef43f95357})
 * Datasource: footer
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
  Logo?: ImageField;
  Heading?: TextField;
  Copyright?: TextField;
  /* Column 1 — Company */
  col1Title?: TextField;
  col1TitleLink?: LinkField;
  col1link1Label?: TextField; col1link1Link?: LinkField;
  col1link2Label?: TextField; col1link2Link?: LinkField;
  col1link3Label?: TextField; col1link3Link?: LinkField;
  col1link4Label?: TextField; col1link4Link?: LinkField;
  /* Column 2 — Our Operations */
  col2Title?: TextField;
  col2TitleLink?: LinkField;
  col2link1Label?: TextField; col2link1Link?: LinkField;
  col2link2Label?: TextField; col2link2Link?: LinkField;
  col2link3Label?: TextField; col2link3Link?: LinkField;
  col2link4Label?: TextField; col2link4Link?: LinkField;
  col2link5Label?: TextField; col2link5Link?: LinkField;
  /* Column 3 — Projects */
  col3Title?: TextField;
  col3TitleLink?: LinkField;
  col3link1Label?: TextField; col3link1Link?: LinkField;
  col3link2Label?: TextField; col3link2Link?: LinkField;
  col3link3Label?: TextField; col3link3Link?: LinkField;
  col3link4Label?: TextField; col3link4Link?: LinkField;
  /* Column 4 — Sustainability */
  col4Title?: TextField;
  col4TitleLink?: LinkField;
  col4link1Label?: TextField; col4link1Link?: LinkField;
  col4link2Label?: TextField; col4link2Link?: LinkField;
  col4link3Label?: TextField; col4link3Link?: LinkField;
  col4link4Label?: TextField; col4link4Link?: LinkField;
  /* Column 5 — Investor Relations */
  col5Title?: TextField;
  col5TitleLink?: LinkField;
  col5link1Label?: TextField; col5link1Link?: LinkField;
  col5link2Label?: TextField; col5link2Link?: LinkField;
  col5link3Label?: TextField; col5link3Link?: LinkField;
  col5link4Label?: TextField; col5link4Link?: LinkField;
  col5link5Label?: TextField; col5link5Link?: LinkField;
  col5link6Label?: TextField; col5link6Link?: LinkField;
  col5link7Label?: TextField; col5link7Link?: LinkField;
  col5link8Label?: TextField; col5link8Link?: LinkField;
  col5link9Label?: TextField; col5link9Link?: LinkField;
  /* Social links */
  social1Platform?: TextField;
  social1Link?: LinkField;
  social2Platform?: TextField;
  social2Link?: LinkField;
  social3Platform?: TextField;
  social3Link?: LinkField;
  /* Bottom bar */
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

// ─── Social icon SVGs ───────────────────────────────────────────────────────────

const SocialIcon = ({ platform }: { platform: string }) => {
  if (platform === 'linkedin') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  if (platform === 'x' || platform === 'twitter') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  if (platform === 'instagram') return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
  return null;
};

// ─── Helper: render a column of links ───────────────────────────────────────────

function FooterColumn({
  title,
  titleLink,
  links,
  isEditing,
}: {
  title?: TextField;
  titleLink?: LinkField;
  links: { label?: TextField; link?: LinkField }[];
  isEditing?: boolean;
}) {
  if (!title?.value && !isEditing) return null;
  const filteredLinks = links.filter((l) => l.label?.value || isEditing);
  const href = String(titleLink?.value?.href || '#');

  return (
    <div className="relative w-full md:w-1/2 lg:w-1/5 max-w-full px-[7.5px] mb-[30px] lg:mb-0">
      <div className="w-full pb-[50px]">
        <h5 className="w-full mb-[25px] text-[20px] font-[700] leading-[32px]">
          {isEditing ? (
            <Text field={title} tag="span" className="text-white" />
          ) : (
            <a
              href={href}
              className="text-white hover:text-[#008cb1] transition-colors duration-300"
            >
              <Text field={title} tag="span" />
            </a>
          )}
        </h5>
        {filteredLinks.length > 0 && (
          <ul className="w-full">
            {filteredLinks.map((item, idx) => {
              const linkHref = String(item.link?.value?.href || '#');
              return (
                <li
                  key={idx}
                  className={`w-full ${idx < filteredLinks.length - 1 ? 'mb-[15px]' : ''}`}
                >
                  {isEditing ? (
                    <Text
                      field={item.label}
                      tag="span"
                      className="text-[14px] leading-[21px] text-white/80"
                    />
                  ) : (
                    <a
                      href={linkHref}
                      className="text-[14px] leading-[21px] text-white/80 hover:text-white transition-colors duration-300"
                    >
                      <Text field={item.label} tag="span" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const FooterInner = (
  props: FooterProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <footer className="component footer" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Footer</span>
        </div>
      </footer>
    );
  }

  // Logo URL — rewrite hostname for local dev
  const rawLogoSrc = fields.Logo?.value?.src || '';
  const logoSrc = rawLogoSrc
    ? rawLogoSrc.replace(/https?:\/\/adnocgas\.localhost/, 'https://xmcloudcm.localhost')
    : 'https://www.adnocgas.ae/-/media/gas/images/logos/adnoc-gas-logo-white.svg';

  // Build column data using numbered flat fields
  const columns = [
    {
      title: fields.col1Title,
      titleLink: fields.col1TitleLink,
      links: [
        { label: fields.col1link1Label, link: fields.col1link1Link },
        { label: fields.col1link2Label, link: fields.col1link2Link },
        { label: fields.col1link3Label, link: fields.col1link3Link },
        { label: fields.col1link4Label, link: fields.col1link4Link },
      ],
    },
    {
      title: fields.col2Title,
      titleLink: fields.col2TitleLink,
      links: [
        { label: fields.col2link1Label, link: fields.col2link1Link },
        { label: fields.col2link2Label, link: fields.col2link2Link },
        { label: fields.col2link3Label, link: fields.col2link3Link },
        { label: fields.col2link4Label, link: fields.col2link4Link },
        { label: fields.col2link5Label, link: fields.col2link5Link },
      ],
    },
    {
      title: fields.col3Title,
      titleLink: fields.col3TitleLink,
      links: [
        { label: fields.col3link1Label, link: fields.col3link1Link },
        { label: fields.col3link2Label, link: fields.col3link2Link },
        { label: fields.col3link3Label, link: fields.col3link3Link },
        { label: fields.col3link4Label, link: fields.col3link4Link },
      ],
    },
    {
      title: fields.col4Title,
      titleLink: fields.col4TitleLink,
      links: [
        { label: fields.col4link1Label, link: fields.col4link1Link },
        { label: fields.col4link2Label, link: fields.col4link2Link },
        { label: fields.col4link3Label, link: fields.col4link3Link },
        { label: fields.col4link4Label, link: fields.col4link4Link },
      ],
    },
    {
      title: fields.col5Title,
      titleLink: fields.col5TitleLink,
      links: [
        { label: fields.col5link1Label, link: fields.col5link1Link },
        { label: fields.col5link2Label, link: fields.col5link2Link },
        { label: fields.col5link3Label, link: fields.col5link3Link },
        { label: fields.col5link4Label, link: fields.col5link4Link },
        { label: fields.col5link5Label, link: fields.col5link5Link },
        { label: fields.col5link6Label, link: fields.col5link6Link },
        { label: fields.col5link7Label, link: fields.col5link7Link },
        { label: fields.col5link8Label, link: fields.col5link8Link },
        { label: fields.col5link9Label, link: fields.col5link9Link },
      ],
    },
  ];

  const socials = [
    { platform: fields.social1Platform, link: fields.social1Link },
    { platform: fields.social2Platform, link: fields.social2Link },
    { platform: fields.social3Platform, link: fields.social3Link },
  ].filter((s) => s.platform?.value || isPageEditing);

  const bottomLinks = [
    { label: fields.bottom1Label, link: fields.bottom1Link },
    { label: fields.bottom2Label, link: fields.bottom2Link },
    { label: fields.bottom3Label, link: fields.bottom3Link },
    { label: fields.bottom4Label, link: fields.bottom4Link },
  ].filter((b) => b.label?.value || isPageEditing);

  return (
    <footer
      data-component="Footer"
      id={id ? id : undefined}
      className="footer-section relative w-full py-[40px] lg:py-[66px] bg-[#505557] font-['ADNOC_Sans',sans-serif] text-[16px] font-[400] leading-[24px]"
    >
      <div className="w-full max-w-[1400px] px-[7.5px] mx-auto text-white">
        {/* Main footer content */}
        <div className="flex flex-col lg:flex-row flex-wrap mx-[-7.5px]">
          {/* Logo + Copyright column */}
          <div className="flex flex-col relative w-full lg:w-[233.328px] max-w-full px-[7.5px] mb-[30px] lg:mb-0">
            <a href="/en/" className="inline-block mb-[10px]">
              {(fields.Logo?.value?.src || isPageEditing) ? (
                <ContentSdkImage
                  field={{
                    ...fields.Logo,
                    value: {
                      ...fields.Logo?.value,
                      src: logoSrc,
                      style: { height: '60px', width: 'auto' },
                    },
                  }}
                />
              ) : (
                <Text field={fields.Heading} tag="div" className="text-white text-[20px] font-[700]" />
              )}
            </a>
            {(fields.Copyright?.value || isPageEditing) && (
              <Text
                field={fields.Copyright}
                tag="p"
                className="w-full mt-[20px] mb-[25px] text-[14px] leading-[21px] text-white/80"
              />
            )}
          </div>

          {/* Link columns */}
          <div className="relative w-full lg:w-[calc(100%-233.328px)] max-w-full pr-[7.5px] pl-[7.5px] lg:pl-[50px]">
            <div className="flex flex-col md:flex-row flex-wrap mx-[-7.5px]">
              {columns.map((col, colIdx) => (
                <FooterColumn
                  key={colIdx}
                  title={col.title}
                  titleLink={col.titleLink}
                  links={col.links}
                  isEditing={isPageEditing}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Social links row */}
        {socials.length > 0 && (
          <div className="relative w-full max-w-full px-[7.5px] mt-[20px]">
            <div className="flex flex-row flex-wrap">
              <ul className="flex flex-row flex-wrap">
                {socials.map((social, idx) => {
                  const socialHref = String(social.link?.value?.href || '#');
                  const socialLabel = String(social.platform?.value || '');
                  return (
                    <li key={idx} className="mb-[8px] mr-[24px]">
                      <a
                        href={socialHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={socialLabel}
                        className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full border border-white text-white hover:bg-white hover:text-[#505557] transition-all duration-300"
                      >
                        <SocialIcon platform={socialLabel.toLowerCase()} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        {bottomLinks.length > 0 && (
          <div className="flex flex-row flex-wrap mt-[20px] pt-[20px] border-t border-white/20 mx-[-7.5px]">
            <div className="flex flex-row justify-center relative w-full max-w-full px-[7.5px]">
              <div className="relative">
                <ul className="flex flex-row flex-wrap">
                  {bottomLinks.map((bl, idx) => {
                    const blHref = String(bl.link?.value?.href || '#');
                    return (
                      <li key={idx} className="flex flex-row items-center text-[14px] leading-[21px]">
                        {isPageEditing ? (
                          <Text
                            field={bl.label}
                            tag="span"
                            className="text-white/80"
                          />
                        ) : (
                          <a
                            href={blHref}
                            className="text-white/80 hover:text-white transition-colors duration-300"
                          >
                            <Text field={bl.label} tag="span" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<FooterProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <FooterInner {...props} isPageEditing={isEditing} />;
};
