'use client';

/**
 * HeroInner — Inner page hero with background image + heading overlay
 * Sitecore fields: Heading (Single-Line Text), BackgroundImage (Image)
 * Template: HeroCentered ({3b7217d269de4b179c2ca7d7d7c26d9b})
 * Rendering: HeroCentered ({99e40b86b568433884150eb008a08a99})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  NextImage as ContentSdkImage,
  ImageField,
  TextField,
  Text,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface HeroInnerParams {
  [key: string]: string;
}

export interface HeroInnerFields {
  Heading?: TextField;
  BackgroundImage?: ImageField;
}

export interface HeroInnerProps extends ComponentProps {
  params: HeroInnerParams;
  fields: HeroInnerFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const HeroInnerDefault = (
  props: HeroInnerProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component hero-inner" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">HeroInner</span>
        </div>
      </section>
    );
  }

  const { Heading, BackgroundImage } = fields || {};

  return (
    <section
      data-component="HeroInner"
      id={id ? id : undefined}
      className="w-full relative min-h-[200px] md:min-h-[300px] lg:min-h-[400px] flex items-end font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: '#001a70' }}
    >
      {/* Background image — editable via ContentSdkImage */}
      {(BackgroundImage?.value?.src || isPageEditing) && (
        <ContentSdkImage
          field={{
            ...BackgroundImage,
            value: {
              ...BackgroundImage?.value,
              style: {
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              },
            },
          }}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 z-10" style={{ backgroundColor: 'rgba(0,26,112,0.45)' }} />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[20px] pb-[32px] md:pb-[48px] lg:pb-[64px] pt-[100px] md:pt-[140px] lg:pt-[200px]">
        {(Heading?.value || isPageEditing) && (
          <Text
            field={Heading}
            tag="h1"
            className="text-[32px] md:text-[50px] lg:text-[70px] font-[700] leading-[1.1] lg:leading-[77px] text-white"
          />
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeroInnerProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroInnerDefault {...props} isPageEditing={isEditing} />;
};
