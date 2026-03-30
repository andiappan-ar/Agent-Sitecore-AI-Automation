'use client';

/**
 * ArticlesListing — Grid of article cards with image, date, title, description, link
 * Sitecore fields: card1-6 x (Image, Date, Title, Description, CtaLabel, CtaLink)
 * Template: CardGrid ({50cef7b9862f4ca390ce2e3ee6b48c80})
 * Rendering: CardGrid ({49efa383672a4efc9a157469dd8dad90})
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

interface ArticlesListingParams {
  [key: string]: string;
}

export interface ArticlesListingFields {
  card1Image?: ImageField;
  card1Date?: TextField;
  card1Title?: TextField;
  card1Description?: TextField;
  card1CtaLabel?: TextField;
  card1CtaLink?: LinkField;
  card2Image?: ImageField;
  card2Date?: TextField;
  card2Title?: TextField;
  card2Description?: TextField;
  card2CtaLabel?: TextField;
  card2CtaLink?: LinkField;
  card3Image?: ImageField;
  card3Date?: TextField;
  card3Title?: TextField;
  card3Description?: TextField;
  card3CtaLabel?: TextField;
  card3CtaLink?: LinkField;
  card4Image?: ImageField;
  card4Date?: TextField;
  card4Title?: TextField;
  card4Description?: TextField;
  card4CtaLabel?: TextField;
  card4CtaLink?: LinkField;
  card5Image?: ImageField;
  card5Date?: TextField;
  card5Title?: TextField;
  card5Description?: TextField;
  card5CtaLabel?: TextField;
  card5CtaLink?: LinkField;
  card6Image?: ImageField;
  card6Date?: TextField;
  card6Title?: TextField;
  card6Description?: TextField;
  card6CtaLabel?: TextField;
  card6CtaLink?: LinkField;
}

export interface ArticlesListingProps extends ComponentProps {
  params: ArticlesListingParams;
  fields: ArticlesListingFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const ArticlesListingDefault = (
  props: ArticlesListingProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component articles-listing" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">ArticlesListing</span>
        </div>
      </section>
    );
  }

  const cards = [1, 2, 3, 4, 5, 6].map((n) => ({
    image: (fields as Record<string, unknown>)[`card${n}Image`] as ImageField | undefined,
    date: (fields as Record<string, unknown>)[`card${n}Date`] as TextField | undefined,
    title: (fields as Record<string, unknown>)[`card${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`card${n}Description`] as TextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`card${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`card${n}CtaLink`] as LinkField | undefined,
  })).filter((c) => c.title?.value || isPageEditing);

  return (
    <section data-component="ArticlesListing" id={id ? id : undefined} className="articles-listing-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] lg:gap-[32px]">
          {cards.map((card, i) => (
            <div key={i} className="group bg-white rounded-[4px] overflow-hidden border border-[#dbdcdb]">
              {(card.image?.value?.src || isPageEditing) && card.image && (
                <div className="relative overflow-hidden h-[200px] md:h-[220px] lg:h-[240px]">
                  <ContentSdkImage
                    field={{
                      ...card.image,
                      value: {
                        ...card.image?.value,
                        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 500ms' },
                      },
                    }}
                  />
                </div>
              )}
              <div className="p-[20px] md:p-[24px]">
                {(card.date?.value || isPageEditing) && (
                  <Text field={card.date} tag="span" className="text-[14px] font-[400] leading-[21px] text-[#505557] mb-[8px] block" />
                )}
                {(card.title?.value || isPageEditing) && (
                  <Text field={card.title} tag="h4" className="text-[18px] md:text-[20px] lg:text-[23px] font-[700] leading-[1.2] lg:leading-[28px] text-[#003341] mb-[12px]" />
                )}
                {(card.description?.value || isPageEditing) && (
                  <Text field={card.description} tag="p" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[16px] line-clamp-3" />
                )}
                {(card.ctaLabel?.value || isPageEditing) && (
                  isPageEditing ? (
                    <Text field={card.ctaLabel} tag="span" className="text-[16px] font-[800] leading-[24px] text-[#008cb1] uppercase" />
                  ) : (
                    <a href={String(card.ctaLink?.value?.href || '#')} className="text-[16px] font-[800] leading-[24px] text-[#008cb1] hover:text-[#003341] transition-colors duration-200 uppercase">
                      {String(card.ctaLabel?.value || '')}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<ArticlesListingProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ArticlesListingDefault {...props} isPageEditing={isEditing} />;
};
