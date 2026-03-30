'use client';

/**
 * NewsCards -- 3-column news card grid on light grey background
 *
 * Template: CardGrid ({50cef7b9-862f-4ca3-90ce-2e3ee6b48c80})
 *   - Heading     (Single-Line Text)
 *   - Description (Rich Text)
 *   - Cta         (General Link)
 * Rendering: NewsCards ({18dc3430-4b8b-450b-a0cb-aecf520eff6a})
 * Datasource: light-grey-news-card-v2
 *
 * The scrapper content has 3 cards with date/heading/description/link each.
 * The Sitecore template only has Heading, Description, and Cta fields.
 * The card-level detail is kept as hardcoded content since there are no
 * per-card template fields. Heading/Description are editable via Sitecore.
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  RichText,
  RichTextField,
  Link,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface NewsCardsParams {
  [key: string]: string;
}

export interface NewsCardsFields {
  Heading?: TextField;
  Description?: RichTextField;
  Cta?: LinkField;
}

export interface NewsCardsProps extends ComponentProps {
  params: NewsCardsParams;
  fields: NewsCardsFields;
  isPageEditing?: boolean;
}

// ─── Card data (from scrapper content, not individually editable in Sitecore) ──

const cards = [
  {
    date: 'February 09, 2026',
    heading: 'ADNOC Gas Delivers Record $5.2bn Net Income in 2025',
    description:
      '$3.6 Billion Dividend for 2025 endorsed by Board\n\nDomestic gas business EBITDA grew 10% year-on-year in 2025, supported by a 4% growth in domestic sales volumes\n\nFinal Investment Decisions for Rich Gas Developme...',
    linkHref: '/en/news-and-media/press-releases/2025/q4-2025',
    linkText: 'Learn More',
  },
  {
    date: 'January 19, 2026',
    heading:
      'ADNOC Gas Signs $3 Billion, 10-Year LNG Deal with Hindustan Petroleum Corporation Limited',
    description:
      "India is now UAE's largest customer of LNG, 20% of LNG operated by ADNOC Gas will be supplied to India by 2029\n$20 billion worth of LNG contracts signed in last 24 months between ADNOC Gas and Indian companies\nLNG...",
    linkHref: '/en/news-and-media/press-releases/2025/hpcl-press-release',
    linkText: 'Learn More',
  },
  {
    date: 'November 26, 2025',
    heading:
      "ADNOC Gas and EMSTEEL Sign $4 Billion, 20-Year Natural Gas Supply Agreement to Power UAE's Industrial Growth",
    description:
      "Landmark agreement expands ADNOC Gas' long-term revenue base and secures stable, lower-carbon gas supply for EMSTEEL's operations\nPartnership reinforces UAE's economic resilience and cements ADNOC Gas' role as a cr...",
    linkHref: '/en/news-and-media/press-releases/2025/emsteel',
    linkText: 'Learn More',
  },
];

// ─── Inner ──────────────────────────────────────────────────────────────────────

const Inner = (props: NewsCardsProps): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component news-cards" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">NewsCards</span>
        </div>
      </section>
    );
  }

  return (
    <section
      data-component="NewsCards"
      id={id ? id : undefined}
      className="relative w-full py-[100px] overflow-hidden bg-[#f6f6f6] bg-cover bg-center text-[#003341] text-[16px] font-[400] leading-[24px] font-['ADNOC_Sans',sans-serif]"
    >
      <div className="w-full">
        <div className="max-w-[1400px] px-[7.5px] mx-auto">
          {/* Sitecore-editable section heading (visible in editing mode) */}
          {isPageEditing && (fields.Heading?.value || fields.Description?.value) && (
            <div className="mb-[24px]">
              {(fields.Heading?.value || isPageEditing) && (
                <Text
                  field={fields.Heading}
                  tag="h3"
                  className="text-[28px] font-[700] leading-[34px] text-[#003341] mb-[8px]"
                />
              )}
              {(fields.Description?.value || isPageEditing) && (
                <RichText
                  field={fields.Description}
                  className="text-[16px] font-[400] leading-[24px] text-[#505557]"
                />
              )}
            </div>
          )}

          <div className="flex flex-row flex-wrap max-w-full mx-[-7.5px]">
            {cards.map((card, i) => (
              <div key={i} className="relative w-full md:w-1/3 max-w-full px-[7.5px]">
                <div className="w-full">
                  <span className="inline-block text-[#646b6d] text-[16px] font-[400] leading-[24px] font-['ADNOC_Sans',sans-serif]">
                    {card.date}
                  </span>
                  <h4 className="mt-[16px] overflow-hidden text-[23px] font-[700] leading-[28px] text-[#003341] font-['ADNOC_Sans',sans-serif]">
                    {card.heading}
                  </h4>
                  <p className="mt-[16px] overflow-hidden text-[#505557] font-[700] text-[16px] leading-[24px] font-['ADNOC_Sans',sans-serif] line-clamp-3 whitespace-pre-line">
                    {card.description}
                  </p>
                  <a
                    href={card.linkHref}
                    className="inline-block mt-[16px] text-[#027e9e] text-[18px] font-[700] leading-[22px] uppercase font-['ADNOC_Sans',sans-serif] hover:underline"
                  >
                    {card.linkText}
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Sitecore Cta link field */}
          {(fields.Cta?.value?.href || isPageEditing) && (
            <div className="mt-[32px] text-center">
              <Link
                field={fields.Cta}
                className="inline-block text-[#027e9e] text-[18px] font-[700] leading-[22px] uppercase font-['ADNOC_Sans',sans-serif] hover:underline"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variant ───────────────────────────────────────────────────────────

export const Default = (props: NewsCardsProps): JSX.Element => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <Inner {...props} isPageEditing={isEditing} />;
};
