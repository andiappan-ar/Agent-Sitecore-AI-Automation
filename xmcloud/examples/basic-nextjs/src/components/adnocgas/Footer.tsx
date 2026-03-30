'use client';

/**
 * Footer — Multi-column footer with logo, 5 link columns, social icons, bottom bar
 * Exact structure from scrapper Footer.jsx, all content from Sitecore fields.
 * Template: Footer
 * Rendering: Footer ({51986d617cb047aba3ee8bef43f95357})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  LinkField,
  ImageField,
  NextImage as ContentSdkImage,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

interface FooterParams { [key: string]: string; }

export interface FooterFields {
  Logo?: ImageField;
  Heading?: TextField;
  Description?: TextField;
  Copyright?: TextField;
  col1Title?: TextField; col1link1Label?: TextField; col1link1Link?: LinkField; col1link2Label?: TextField; col1link2Link?: LinkField; col1link3Label?: TextField; col1link3Link?: LinkField; col1link4Label?: TextField; col1link4Link?: LinkField; col1link5Label?: TextField; col1link5Link?: LinkField;
  col2Title?: TextField; col2link1Label?: TextField; col2link1Link?: LinkField; col2link2Label?: TextField; col2link2Link?: LinkField; col2link3Label?: TextField; col2link3Link?: LinkField; col2link4Label?: TextField; col2link4Link?: LinkField; col2link5Label?: TextField; col2link5Link?: LinkField;
  col3Title?: TextField; col3link1Label?: TextField; col3link1Link?: LinkField; col3link2Label?: TextField; col3link2Link?: LinkField; col3link3Label?: TextField; col3link3Link?: LinkField; col3link4Label?: TextField; col3link4Link?: LinkField; col3link5Label?: TextField; col3link5Link?: LinkField;
  col4Title?: TextField; col4link1Label?: TextField; col4link1Link?: LinkField; col4link2Label?: TextField; col4link2Link?: LinkField; col4link3Label?: TextField; col4link3Link?: LinkField; col4link4Label?: TextField; col4link4Link?: LinkField; col4link5Label?: TextField; col4link5Link?: LinkField;
  col5Title?: TextField; col5link1Label?: TextField; col5link1Link?: LinkField; col5link2Label?: TextField; col5link2Link?: LinkField; col5link3Label?: TextField; col5link3Link?: LinkField; col5link4Label?: TextField; col5link4Link?: LinkField; col5link5Label?: TextField; col5link5Link?: LinkField;
  social1Label?: TextField; social1Link?: LinkField;
  social2Label?: TextField; social2Link?: LinkField;
  social3Label?: TextField; social3Link?: LinkField;
  BottomLinkLabel?: TextField; BottomLinkHref?: LinkField;
}

export interface FooterProps extends ComponentProps {
  params: FooterParams;
  fields: FooterFields;
  isPageEditing?: boolean;
}

const SOCIAL_ICONS: Record<string, JSX.Element> = {
  LinkedIn: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  Twitter: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  Instagram: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
};

function buildColumns(fields: FooterFields, isEditing?: boolean) {
  const cols = [];
  for (let c = 1; c <= 5; c++) {
    const title = (fields as any)[`col${c}Title`] as TextField | undefined;
    if (!title?.value && !isEditing) continue;
    const links = [];
    for (let l = 1; l <= 5; l++) {
      const label = (fields as any)[`col${c}link${l}Label`] as TextField | undefined;
      const link = (fields as any)[`col${c}link${l}Link`] as LinkField | undefined;
      if (label?.value || isEditing) links.push({ label, link });
    }
    cols.push({ title, links });
  }
  return cols;
}

function buildSocials(fields: FooterFields, isEditing?: boolean) {
  const socials = [];
  for (let s = 1; s <= 3; s++) {
    const label = (fields as any)[`social${s}Label`] as TextField | undefined;
    const link = (fields as any)[`social${s}Link`] as LinkField | undefined;
    if (label?.value || isEditing) socials.push({ label, link });
  }
  return socials;
}

const FooterDefault = (props: FooterProps & { isPageEditing?: boolean }): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (<footer className="component footer" id={id}><div className="component-content"><span className="is-empty-hint">Footer</span></div></footer>);
  }

  const columns = buildColumns(fields, isPageEditing);
  const socials = buildSocials(fields, isPageEditing);
  const logoSrc = fields.Logo?.value?.src
    ? String(fields.Logo.value.src).replace(/https?:\/\/adnocgas\.localhost/, 'https://xmcloudcm.localhost')
    : 'https://www.adnocgas.ae/-/media/gas/images/logos/adnoc-gas-logo-white.svg';

  return (
    <footer data-component="Footer" id={id ? id : undefined} className="footer-section relative w-full py-[40px] lg:py-[66px] bg-[#505557] font-['ADNOC_Sans',sans-serif] text-[16px] font-[400] leading-[24px]">
      <div className="w-full max-w-[1400px] px-[7.5px] mx-auto text-white">
        <div className="flex flex-col lg:flex-row flex-wrap mx-[-7.5px]">
          {/* Logo + Copyright */}
          <div className="flex flex-col relative w-full lg:w-[233.328px] max-w-full px-[7.5px] mb-[30px] lg:mb-0">
            <a href="/en/" className="inline-block mb-[10px]">
              {(fields.Logo?.value?.src || isPageEditing) ? (
                <ContentSdkImage field={{ ...fields.Logo, value: { ...fields.Logo?.value, src: logoSrc, style: { height: '60px', width: 'auto' } } }} />
              ) : (
                <img src={logoSrc} alt="ADNOC Gas" className="h-[60px] w-auto" />
              )}
            </a>
            {(fields.Copyright?.value || isPageEditing) && (
              <Text field={fields.Copyright} tag="p" className="w-full mt-[20px] mb-[25px] text-[14px] leading-[21px] text-white/80" />
            )}
          </div>

          {/* Link columns */}
          <div className="relative w-full lg:w-[calc(100%-233.328px)] max-w-full pr-[7.5px] pl-[7.5px] lg:pl-[50px]">
            <div className="flex flex-col md:flex-row flex-wrap mx-[-7.5px]">
              {columns.map((column, colIdx) => (
                <div key={colIdx} className="relative w-full md:w-1/2 lg:w-1/5 max-w-full px-[7.5px] mb-[30px] lg:mb-0">
                  <div className="w-full pb-[50px]">
                    {(column.title?.value || isPageEditing) && (
                      <h5 className="w-full mb-[25px] text-[20px] font-[700] leading-[32px]">
                        <Text field={column.title} tag="span" className="text-white hover:text-[#008cb1] transition-colors duration-300" />
                      </h5>
                    )}
                    <ul className="w-full">
                      {column.links.map((lnk, linkIdx) => (
                        <li key={linkIdx} className={`w-full ${linkIdx < column.links.length - 1 ? 'mb-[15px]' : ''}`}>
                          {isPageEditing ? (
                            <Text field={lnk.label} tag="span" className="text-[14px] leading-[21px] text-white/80" />
                          ) : (
                            <a href={String(lnk.link?.value?.href || '#')} className="text-[14px] leading-[21px] text-white/80 hover:text-white transition-colors duration-300">
                              <Text field={lnk.label} tag="span" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="relative w-full max-w-full px-[7.5px] mt-[20px]">
          <ul className="flex flex-row flex-wrap">
            {socials.map((social, idx) => {
              const label = String(social.label?.value || '');
              const href = String(social.link?.value?.href || '#');
              const icon = SOCIAL_ICONS[label] || SOCIAL_ICONS['LinkedIn'];
              return (
                <li key={idx} className="mb-[8px] mr-[24px]">
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-full border border-white text-white hover:bg-white hover:text-[#505557] transition-all duration-300">
                    {icon}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-row flex-wrap mt-[20px] pt-[20px] border-t border-white/20 mx-[-7.5px]">
          <div className="flex flex-row justify-center relative w-full max-w-full px-[7.5px]">
            <ul className="flex flex-row flex-wrap">
              <li className="text-[14px] leading-[21px]">
                {isPageEditing ? (
                  <Text field={fields.BottomLinkLabel} tag="span" className="text-white/80" />
                ) : (
                  <a href={String(fields.BottomLinkHref?.value?.href || '/en/privacy-policy')} className="text-white/80 hover:text-white transition-colors duration-300">
                    <Text field={fields.BottomLinkLabel} tag="span" />
                  </a>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Default: React.FC<FooterProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <FooterDefault {...props} isPageEditing={isEditing} />;
};
