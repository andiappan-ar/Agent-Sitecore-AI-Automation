'use client';

/**
 * TwoColumnText — Two-column layout with text/CTA and image
 * Sitecore fields: Heading, Description, CtaLabel, CtaLink, Image
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
  RichText,
  RichTextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface TwoColumnTextParams {
  [key: string]: string;
}

export interface TwoColumnTextFields {
  Heading?: TextField;
  Description?: RichTextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  Image?: ImageField;
}

export interface TwoColumnTextProps extends ComponentProps {
  params: TwoColumnTextParams;
  fields: TwoColumnTextFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const TwoColumnTextDefault = (
  props: TwoColumnTextProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component two-column-text" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">TwoColumnText</span>
        </div>
      </section>
    );
  }

  return (
    <section data-component="TwoColumnText" id={id ? id : undefined} className="two-column-text-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[40px] items-center">
          <div className="w-full lg:w-1/2">
            {(fields.Heading?.value || isPageEditing) && (
              <Text field={fields.Heading} tag="h3" className="text-[24px] md:text-[30px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[16px]" />
            )}
            {(fields.Description?.value || isPageEditing) && (
              <RichText field={fields.Description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[24px]" />
            )}
            {(fields.CtaLabel?.value || isPageEditing) && (
              isPageEditing ? (
                <Text field={fields.CtaLabel} tag="span" className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] uppercase" />
              ) : (
                <a href={String(fields.CtaLink?.value?.href || '#')} className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] hover:bg-[#001a70] hover:text-white transition-all duration-300 uppercase">
                  {String(fields.CtaLabel?.value || '')}
                </a>
              )
            )}
          </div>
          {(fields.Image?.value?.src || isPageEditing) && (
            <div className="w-full lg:w-1/2">
              <ContentSdkImage
                field={{
                  ...fields.Image,
                  value: {
                    ...fields.Image?.value,
                    style: { width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'cover' },
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<TwoColumnTextProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <TwoColumnTextDefault {...props} isPageEditing={isEditing} />;
};
