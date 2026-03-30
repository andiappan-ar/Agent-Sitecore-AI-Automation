'use client';

/**
 * PropsColumns — 2-column grid of image cards with overlay title and CTA
 * Sitecore fields: card1-4 x (Title, CtaLabel, CtaLink, BackgroundImage)
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

interface PropsColumnsParams {
  [key: string]: string;
}

export interface PropsColumnsFields {
  card1Title?: TextField;
  card1CtaLabel?: TextField;
  card1CtaLink?: LinkField;
  card1BackgroundImage?: ImageField;
  card2Title?: TextField;
  card2CtaLabel?: TextField;
  card2CtaLink?: LinkField;
  card2BackgroundImage?: ImageField;
  card3Title?: TextField;
  card3CtaLabel?: TextField;
  card3CtaLink?: LinkField;
  card3BackgroundImage?: ImageField;
  card4Title?: TextField;
  card4CtaLabel?: TextField;
  card4CtaLink?: LinkField;
  card4BackgroundImage?: ImageField;
}

export interface PropsColumnsProps extends ComponentProps {
  params: PropsColumnsParams;
  fields: PropsColumnsFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const PropsColumnsDefault = (
  props: PropsColumnsProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component props-columns" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">PropsColumns</span>
        </div>
      </section>
    );
  }

  const cards = [1, 2, 3, 4].map((n) => ({
    title: (fields as Record<string, unknown>)[`card${n}Title`] as TextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`card${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`card${n}CtaLink`] as LinkField | undefined,
    bgImage: (fields as Record<string, unknown>)[`card${n}BackgroundImage`] as ImageField | undefined,
  })).filter((c) => c.title?.value || isPageEditing);

  return (
    <section data-component="PropsColumns" id={id ? id : undefined} className="props-columns-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] md:gap-[20px] lg:gap-[24px]">
          {cards.map((card, i) => {
            const cardHref = String(card.ctaLink?.value?.href || '#');
            const inner = (
              <>
                {(card.bgImage?.value?.src || isPageEditing) && card.bgImage && (
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
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%)' }} />
                <div className="relative z-10 flex flex-col justify-end h-full p-[20px] md:p-[28px] lg:p-[36px] min-h-[240px] md:min-h-[300px] lg:min-h-[360px]">
                  {(card.title?.value || isPageEditing) && (
                    <Text field={card.title} tag="h3" className="text-[22px] md:text-[28px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white mb-[12px]" />
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
              <div key={i} className="group relative block overflow-hidden rounded-[4px] min-h-[240px] md:min-h-[300px] lg:min-h-[360px]" style={{ backgroundColor: '#003341' }}>
                {inner}
              </div>
            ) : (
              <a key={i} href={cardHref} className="group relative block overflow-hidden rounded-[4px] min-h-[240px] md:min-h-[300px] lg:min-h-[360px]" style={{ backgroundColor: '#003341' }}>
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

export const Default: React.FC<PropsColumnsProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <PropsColumnsDefault {...props} isPageEditing={isEditing} />;
};
