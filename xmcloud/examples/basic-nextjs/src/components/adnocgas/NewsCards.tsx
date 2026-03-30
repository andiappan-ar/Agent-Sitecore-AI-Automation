'use client';

/**
 * NewsCards — 3-column news card grid on light grey background
 * Sitecore fields: card1-3 x (Date, Title, Description, CtaLabel, CtaLink)
 * Template: CardGrid ({50cef7b9862f4ca390ce2e3ee6b48c80})
 * Rendering: CardGrid ({49efa383672a4efc9a157469dd8dad90})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  RichText,
  Link,
  TextField,
  RichTextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface NewsCardsParams {
  [key: string]: string;
}

export interface NewsCardsFields {
  Heading?: TextField;
  Description?: RichTextField;
  Cta?: LinkField;
  card1Date?: TextField;
  card1Title?: TextField;
  card1Description?: TextField;
  card1CtaLabel?: TextField;
  card1CtaLink?: LinkField;
  card2Date?: TextField;
  card2Title?: TextField;
  card2Description?: TextField;
  card2CtaLabel?: TextField;
  card2CtaLink?: LinkField;
  card3Date?: TextField;
  card3Title?: TextField;
  card3Description?: TextField;
  card3CtaLabel?: TextField;
  card3CtaLink?: LinkField;
}

export interface NewsCardsProps extends ComponentProps {
  params: NewsCardsParams;
  fields: NewsCardsFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const NewsCardsDefault = (
  props: NewsCardsProps & { isPageEditing?: boolean }
): JSX.Element => {
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

  const cards = [
    {
      date: fields.card1Date,
      title: fields.card1Title,
      description: fields.card1Description,
      ctaLabel: fields.card1CtaLabel,
      ctaLink: fields.card1CtaLink,
    },
    {
      date: fields.card2Date,
      title: fields.card2Title,
      description: fields.card2Description,
      ctaLabel: fields.card2CtaLabel,
      ctaLink: fields.card2CtaLink,
    },
    {
      date: fields.card3Date,
      title: fields.card3Title,
      description: fields.card3Description,
      ctaLabel: fields.card3CtaLabel,
      ctaLink: fields.card3CtaLink,
    },
  ];

  return (
    <section
      data-component="NewsCards"
      id={id ? id : undefined}
      className="w-full bg-[#f6f6f6] py-[32px] md:py-[40px] lg:py-[48px] font-['ADNOC_Sans',sans-serif]"
    >
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[20px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#ddd]">
          {cards.map((card, i) => (
            <div key={i} className="bg-[#f6f6f6] flex flex-col p-[20px] md:p-[24px] lg:p-[28px]">
              {(card.date?.value || isPageEditing) && (
                <Text
                  field={card.date}
                  tag="span"
                  className="text-[13px] font-[400] leading-[20px] text-[#666] mb-[12px]"
                />
              )}
              {(card.title?.value || isPageEditing) && (
                <Text
                  field={card.title}
                  tag="h4"
                  className="text-[16px] md:text-[18px] lg:text-[20px] font-[700] leading-[1.3] text-[#003341] mb-[12px]"
                />
              )}
              {(card.description?.value || isPageEditing) && (
                <Text
                  field={card.description}
                  tag="p"
                  className="text-[13px] md:text-[14px] lg:text-[14px] font-[400] leading-[1.6] text-[#666] mb-[20px] flex-1 line-clamp-4"
                />
              )}
              {(card.ctaLabel?.value || isPageEditing) && (() => {
                const ctaHref = String(card.ctaLink?.value?.href || '#');
                return isPageEditing ? (
                  <Text
                    field={card.ctaLabel}
                    tag="span"
                    className="text-[14px] font-[800] leading-[21px] text-[#008cb1] uppercase tracking-[1px]"
                  />
                ) : (
                  <a
                    href={ctaHref}
                    className="text-[14px] font-[800] leading-[21px] text-[#008cb1] hover:text-[#003341] transition-colors duration-200 uppercase tracking-[1px]"
                  >
                    {String(card.ctaLabel?.value || '')}
                  </a>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<NewsCardsProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <NewsCardsDefault {...props} isPageEditing={isEditing} />;
};
