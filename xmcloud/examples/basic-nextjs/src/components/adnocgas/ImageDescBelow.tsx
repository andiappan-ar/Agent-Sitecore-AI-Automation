'use client';

/**
 * ImageDescBelow — Grid of cards with image on top, text below
 * Sitecore fields: card1-3 x (Image, Title, Description, CtaLabel, CtaLink)
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

interface ImageDescBelowParams {
  [key: string]: string;
}

export interface ImageDescBelowFields {
  card1Image?: ImageField;
  card1Title?: TextField;
  card1Description?: TextField;
  card1CtaLabel?: TextField;
  card1CtaLink?: LinkField;
  card2Image?: ImageField;
  card2Title?: TextField;
  card2Description?: TextField;
  card2CtaLabel?: TextField;
  card2CtaLink?: LinkField;
  card3Image?: ImageField;
  card3Title?: TextField;
  card3Description?: TextField;
  card3CtaLabel?: TextField;
  card3CtaLink?: LinkField;
}

export interface ImageDescBelowProps extends ComponentProps {
  params: ImageDescBelowParams;
  fields: ImageDescBelowFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const ImageDescBelowDefault = (
  props: ImageDescBelowProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component image-desc-below" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">ImageDescBelow</span>
        </div>
      </section>
    );
  }

  const cards = [1, 2, 3].map((n) => ({
    image: (fields as Record<string, unknown>)[`card${n}Image`] as ImageField | undefined,
    title: (fields as Record<string, unknown>)[`card${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`card${n}Description`] as TextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`card${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`card${n}CtaLink`] as LinkField | undefined,
  })).filter((c) => c.title?.value || isPageEditing);

  return (
    <section data-component="ImageDescBelow" id={id ? id : undefined} className="image-desc-below-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] lg:gap-[32px]">
          {cards.map((card, i) => (
            <div key={i} className="group">
              {(card.image?.value?.src || isPageEditing) && card.image && (
                <div className="overflow-hidden rounded-[4px] mb-[16px]">
                  <ContentSdkImage
                    field={{
                      ...card.image,
                      value: {
                        ...card.image?.value,
                        style: { width: '100%', height: '280px', objectFit: 'cover', transition: 'transform 500ms' },
                      },
                    }}
                  />
                </div>
              )}
              {(card.title?.value || isPageEditing) && (
                <Text field={card.title} tag="h4" className="text-[18px] md:text-[20px] lg:text-[23px] font-[700] leading-[1.2] lg:leading-[28px] text-[#003341] mb-[8px]" />
              )}
              {(card.description?.value || isPageEditing) && (
                <Text field={card.description} tag="p" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[12px]" />
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
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<ImageDescBelowProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ImageDescBelowDefault {...props} isPageEditing={isEditing} />;
};
