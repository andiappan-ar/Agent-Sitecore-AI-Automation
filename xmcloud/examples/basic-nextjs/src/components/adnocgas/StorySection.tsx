'use client';

/**
 * StorySection — Content section with dark background image overlay, heading, description, tagline
 * Sitecore fields: Heading, Description, Tagline, BackgroundImage
 * Template: ContentSection ({f04b7bdc079d45dc85c1d862d4d1cf39})
 * Rendering: ContentSection ({e46f18f84a1341e5975768100a011985})
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
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface StorySectionParams {
  [key: string]: string;
}

export interface StorySectionFields {
  Heading?: TextField;
  Description?: RichTextField;
  Tagline?: TextField;
  BackgroundImage?: ImageField;
}

export interface StorySectionProps extends ComponentProps {
  params: StorySectionParams;
  fields: StorySectionFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const StorySectionDefault = (
  props: StorySectionProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component story-section" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">StorySection</span>
        </div>
      </section>
    );
  }

  return (
    <section
      data-component="StorySection"
      id={id ? id : undefined}
      className="story-section w-full relative py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]"
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

      {fields.BackgroundImage?.value?.src && (
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,51,65,0.85)' }} />
      )}

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="max-w-[700px]">
          {(fields.Heading?.value || isPageEditing) && (
            <Text field={fields.Heading} tag="h3" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white mb-[16px] lg:mb-[24px]" />
          )}
          {(fields.Description?.value || isPageEditing) && (
            <RichText field={fields.Description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/90 mb-[24px]" />
          )}
          {(fields.Tagline?.value || isPageEditing) && (
            <Text field={fields.Tagline} tag="span" className="text-[20px] md:text-[25px] font-[400] leading-[1.5] lg:leading-[37.5px] text-[#00bfb2] italic" />
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<StorySectionProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <StorySectionDefault {...props} isPageEditing={isEditing} />;
};
