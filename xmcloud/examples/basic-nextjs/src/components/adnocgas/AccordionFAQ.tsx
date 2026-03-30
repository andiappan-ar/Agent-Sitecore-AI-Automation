'use client';

/**
 * AccordionFAQ — Expandable FAQ accordion with side image
 * Sitecore fields: item1-5 x (Title, Description, CtaLabel, CtaLink, Image)
 * Template: Accordion ({9682c7f43c3c4e65a5fbed7df924867d})
 * Rendering: Accordion ({7ec34c9f1de748b0a0738915485d4d55})
 */

import type React from 'react';
import { type JSX } from 'react';
import { useState } from 'react';
import {
  NextImage as ContentSdkImage,
  ImageField,
  Text,
  TextField,
  RichText,
  RichTextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface AccordionFAQParams {
  [key: string]: string;
}

export interface AccordionFAQFields {
  item1Title?: TextField;
  item1Description?: RichTextField;
  item1CtaLabel?: TextField;
  item1CtaLink?: LinkField;
  item1Image?: ImageField;
  item2Title?: TextField;
  item2Description?: RichTextField;
  item2CtaLabel?: TextField;
  item2CtaLink?: LinkField;
  item2Image?: ImageField;
  item3Title?: TextField;
  item3Description?: RichTextField;
  item3CtaLabel?: TextField;
  item3CtaLink?: LinkField;
  item3Image?: ImageField;
  item4Title?: TextField;
  item4Description?: RichTextField;
  item4CtaLabel?: TextField;
  item4CtaLink?: LinkField;
  item4Image?: ImageField;
  item5Title?: TextField;
  item5Description?: RichTextField;
  item5CtaLabel?: TextField;
  item5CtaLink?: LinkField;
  item5Image?: ImageField;
}

export interface AccordionFAQProps extends ComponentProps {
  params: AccordionFAQParams;
  fields: AccordionFAQFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const AccordionFAQDefault = (
  props: AccordionFAQProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [openIndex, setOpenIndex] = useState(0);

  if (!fields) {
    return (
      <section className="component accordion-faq" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">AccordionFAQ</span>
        </div>
      </section>
    );
  }

  const items = [1, 2, 3, 4, 5].map((n) => ({
    title: (fields as Record<string, unknown>)[`item${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`item${n}Description`] as RichTextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`item${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`item${n}CtaLink`] as LinkField | undefined,
    image: (fields as Record<string, unknown>)[`item${n}Image`] as ImageField | undefined,
  })).filter((item) => item.title?.value || isPageEditing);

  const activeImage = items[openIndex]?.image;

  return (
    <section data-component="AccordionFAQ" id={id ? id : undefined} className="accordion-faq-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[40px]">
          {/* Accordion list */}
          <div className="w-full lg:w-1/2">
            {items.map((item, i) => (
              <div key={i} className="border-b border-[#dbdcdb]">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                  className="w-full flex items-center justify-between py-[16px] md:py-[20px] text-left"
                >
                  {(item.title?.value || isPageEditing) && (
                    <Text field={item.title} tag="h5" className="text-[18px] md:text-[20px] font-[700] leading-[1.3] lg:leading-[32px] text-[#003341]" />
                  )}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`shrink-0 ml-[16px] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="#003341" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="pb-[20px]">
                    {(item.description?.value || isPageEditing) && (
                      <RichText field={item.description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[16px]" />
                    )}
                    {(item.ctaLabel?.value || isPageEditing) && (
                      isPageEditing ? (
                        <Text field={item.ctaLabel} tag="span" className="text-[16px] font-[800] leading-[24px] text-[#008cb1] uppercase" />
                      ) : (
                        <a
                          href={String(item.ctaLink?.value?.href || '#')}
                          className="text-[16px] font-[800] leading-[24px] text-[#008cb1] hover:text-[#003341] transition-colors duration-200 uppercase"
                        >
                          {String(item.ctaLabel?.value || '')}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Image (shown for active item) */}
          <div className="w-full lg:w-1/2">
            {(activeImage?.value?.src || isPageEditing) && activeImage && (
              <ContentSdkImage
                field={{
                  ...activeImage,
                  value: {
                    ...activeImage?.value,
                    style: { width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'cover' },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<AccordionFAQProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <AccordionFAQDefault {...props} isPageEditing={isEditing} />;
};
