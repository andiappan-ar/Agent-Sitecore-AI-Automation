'use client';

/**
 * ImageDescription — 2-column grid of image cards with overlay text
 * Sitecore fields: card1-4 x (Title, Description, CtaLabel, CtaLink, BackgroundImage)
 * Template: SplitContent ({9b675f0bfc4049ad96572c778b653e49})
 * Rendering: SplitContent ({4876fdc1fa2349dcb429de44177a16d3})
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

interface ImageDescriptionParams {
  [key: string]: string;
}

export interface ImageDescriptionFields {
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

export interface ImageDescriptionProps extends ComponentProps {
  params: ImageDescriptionParams;
  fields: ImageDescriptionFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const ImageDescriptionDefault = (
  props: ImageDescriptionProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component image-description" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">ImageDescription</span>
        </div>
      </section>
    );
  }

  const cards = [1, 2, 3, 4].map((n) => ({
    title: (fields as Record<string, unknown>)[`card${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`card${n}Description`] as TextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`card${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`card${n}CtaLink`] as LinkField | undefined,
    bgImage: (fields as Record<string, unknown>)[`card${n}BackgroundImage`] as ImageField | undefined,
  })).filter((c) => c.title?.value || isPageEditing);

  return (
    <section data-component="ImageDescription" id={id ? id : undefined} className="image-description-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] lg:gap-[32px]">
          {cards.map((card, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[4px] min-h-[200px] md:min-h-[280px] lg:min-h-[340px]" style={{ backgroundColor: '#003341' }}>
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
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 60%)' }} />
              <div className="relative z-10 flex flex-col justify-end h-full p-[20px] md:p-[28px] lg:p-[36px] min-h-[200px] md:min-h-[280px] lg:min-h-[340px]">
                {(card.title?.value || isPageEditing) && (
                  <Text field={card.title} tag="h4" className="text-[20px] md:text-[23px] font-[700] leading-[1.2] lg:leading-[28px] text-white mb-[8px]" />
                )}
                {(card.description?.value || isPageEditing) && (
                  <Text field={card.description} tag="p" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/80 mb-[16px]" />
                )}
                {(card.ctaLabel?.value || isPageEditing) && (
                  isPageEditing ? (
                    <Text field={card.ctaLabel} tag="span" className="text-[16px] font-[800] leading-[24px] text-[#00bfb2] uppercase" />
                  ) : (
                    <a href={String(card.ctaLink?.value?.href || '#')} className="text-[16px] font-[800] leading-[24px] text-[#00bfb2] hover:text-white transition-colors duration-200 uppercase">
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

export const Default: React.FC<ImageDescriptionProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ImageDescriptionDefault {...props} isPageEditing={isEditing} />;
};
