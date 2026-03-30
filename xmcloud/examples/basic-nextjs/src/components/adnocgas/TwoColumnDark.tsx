'use client';

/**
 * TwoColumnDark — Dark overlay section with background image, heading, description, CTA
 * Sitecore fields: Heading, Description, CtaLabel, CtaLink, BackgroundImage
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

interface TwoColumnDarkParams {
  [key: string]: string;
}

export interface TwoColumnDarkFields {
  Heading?: TextField;
  Description?: RichTextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  BackgroundImage?: ImageField;
}

export interface TwoColumnDarkProps extends ComponentProps {
  params: TwoColumnDarkParams;
  fields: TwoColumnDarkFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const TwoColumnDarkDefault = (
  props: TwoColumnDarkProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component two-column-dark" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">TwoColumnDark</span>
        </div>
      </section>
    );
  }

  return (
    <section
      data-component="TwoColumnDark"
      id={id ? id : undefined}
      className="two-column-dark-section w-full relative min-h-[300px] md:min-h-[400px] lg:min-h-[500px] overflow-hidden font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: '#003341' }}
    >
      {/* Background image */}
      {(fields.BackgroundImage?.value?.src || isPageEditing) && (
        <ContentSdkImage
          field={{
            ...fields.BackgroundImage,
            value: {
              ...fields.BackgroundImage?.value,
              style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
            },
          }}
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: 'rgba(0,26,112,0.65)' }} />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px] py-[40px] md:py-[60px] lg:py-[80px] flex flex-col justify-center min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
        <div className="max-w-[600px]">
          {(fields.Heading?.value || isPageEditing) && (
            <Text field={fields.Heading} tag="h2" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white mb-[16px] lg:mb-[24px]" />
          )}
          {(fields.Description?.value || isPageEditing) && (
            <RichText field={fields.Description} className="text-[14px] md:text-[15px] lg:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/90 mb-[24px] lg:mb-[32px]" />
          )}
          {(fields.CtaLabel?.value || isPageEditing) && (
            isPageEditing ? (
              <Text field={fields.CtaLabel} tag="span" className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] uppercase" />
            ) : (
              <a
                href={String(fields.CtaLink?.value?.href || '#')}
                className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] hover:bg-white transition-all duration-300 uppercase"
              >
                {String(fields.CtaLabel?.value || '')}
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<TwoColumnDarkProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <TwoColumnDarkDefault {...props} isPageEditing={isEditing} />;
};
