'use client';

/**
 * ColumnsGrid — 2-column image card grid with overlay text
 * Sitecore fields: card1-4 x (Title, Description, CtaLabel, CtaLink, BackgroundImage)
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
  RichText,
  RichTextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface ColumnsGridParams {
  [key: string]: string;
}

export interface ColumnsGridFields {
  card1Title?: TextField;
  card1Description?: TextField;
  card1CtaLabel?: TextField;
  card1CtaLink?: LinkField;
  card1BackgroundImage?: ImageField;
  card2Title?: TextField;
  card2Description?: TextField;
  card2CtaLabel?: TextField;
  card2CtaLink?: LinkField;
  card2BackgroundImage?: ImageField;
  card3Title?: TextField;
  card3Description?: TextField;
  card3CtaLabel?: TextField;
  card3CtaLink?: LinkField;
  card3BackgroundImage?: ImageField;
  card4Title?: TextField;
  card4Description?: TextField;
  card4CtaLabel?: TextField;
  card4CtaLink?: LinkField;
  card4BackgroundImage?: ImageField;
}

export interface ColumnsGridProps extends ComponentProps {
  params: ColumnsGridParams;
  fields: ColumnsGridFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const ColumnsGridDefault = (
  props: ColumnsGridProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component columns-grid" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">ColumnsGrid</span>
        </div>
      </section>
    );
  }

  const cards = [
    { title: fields.card1Title, description: fields.card1Description, ctaLabel: fields.card1CtaLabel, ctaLink: fields.card1CtaLink, bgImage: fields.card1BackgroundImage },
    { title: fields.card2Title, description: fields.card2Description, ctaLabel: fields.card2CtaLabel, ctaLink: fields.card2CtaLink, bgImage: fields.card2BackgroundImage },
    { title: fields.card3Title, description: fields.card3Description, ctaLabel: fields.card3CtaLabel, ctaLink: fields.card3CtaLink, bgImage: fields.card3BackgroundImage },
    { title: fields.card4Title, description: fields.card4Description, ctaLabel: fields.card4CtaLabel, ctaLink: fields.card4CtaLink, bgImage: fields.card4BackgroundImage },
  ].filter((c) => c.title?.value || isPageEditing);

  return (
    <section data-component="ColumnsGrid" id={id ? id : undefined} className="columns-grid-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] md:gap-[20px] lg:gap-[24px]">
          {cards.map((card, i) => {
            const cardHref = String(card.ctaLink?.value?.href || '#');
            const inner = (
              <>
                {/* Background image */}
                {(card.bgImage?.value?.src || isPageEditing) && (
                  <ContentSdkImage
                    field={{
                      ...card.bgImage,
                      value: {
                        ...card.bgImage?.value,
                        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 500ms' },
                      },
                    }}
                  />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%)' }} />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-end h-full p-[20px] md:p-[24px] lg:p-[32px] min-h-[200px] md:min-h-[260px] lg:min-h-[320px]">
                  {(card.title?.value || isPageEditing) && (
                    <Text field={card.title} tag="h3" className="text-[20px] md:text-[28px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white mb-[8px]" />
                  )}
                  {(card.description?.value || isPageEditing) && (
                    <Text field={card.description} tag="p" className="text-[14px] md:text-[15px] lg:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/80 mb-[12px] line-clamp-3" />
                  )}
                  {(card.ctaLabel?.value || isPageEditing) && (
                    isPageEditing ? (
                      <Text field={card.ctaLabel} tag="span" className="text-[14px] md:text-[16px] font-[800] leading-[24px] text-[#00bfb2] uppercase" />
                    ) : (
                      <span className="text-[14px] md:text-[16px] font-[800] leading-[24px] text-[#00bfb2] group-hover:text-white transition-colors duration-200 uppercase">
                        {String(card.ctaLabel?.value || '')}
                      </span>
                    )
                  )}
                </div>
              </>
            );

            return isPageEditing ? (
              <div key={i} className="group relative block overflow-hidden rounded-[4px] min-h-[200px] md:min-h-[260px] lg:min-h-[320px]" style={{ backgroundColor: '#003341' }}>
                {inner}
              </div>
            ) : (
              <a key={i} href={cardHref} className="group relative block overflow-hidden rounded-[4px] min-h-[200px] md:min-h-[260px] lg:min-h-[320px]" style={{ backgroundColor: '#003341' }}>
                {inner}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<ColumnsGridProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ColumnsGridDefault {...props} isPageEditing={isEditing} />;
};
