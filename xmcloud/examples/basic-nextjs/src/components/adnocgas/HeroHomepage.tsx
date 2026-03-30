'use client';

/**
 * HeroHomepage — Full-screen hero with background image/video, heading, CTA, and 4 stats
 * Sitecore fields: Heading, Subheading, Description, BackgroundImage, VideoUrl, CtaLabel, CtaLink, stat1-4 x (Title, Subtitle)
 * Template: HeroVideo ({d4b3c51e36784cbd84d2e0aab3be8c59})
 * Rendering: HeroHomepage ({6c82126efbc1497dbea3076c1194053f})
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

interface HeroHomepageParams {
  [key: string]: string;
}

export interface HeroHomepageFields {
  Heading?: TextField;
  Subheading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  VideoUrl?: TextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  stat1Title?: TextField;
  stat1Subtitle?: TextField;
  stat2Title?: TextField;
  stat2Subtitle?: TextField;
  stat3Title?: TextField;
  stat3Subtitle?: TextField;
  stat4Title?: TextField;
  stat4Subtitle?: TextField;
}

export interface HeroHomepageProps extends ComponentProps {
  params: HeroHomepageParams;
  fields: HeroHomepageFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const HeroHomepageDefault = (
  props: HeroHomepageProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component hero-homepage" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">HeroHomepage</span>
        </div>
      </section>
    );
  }

  const { Heading, Subheading, Description, BackgroundImage, VideoUrl, CtaLabel, CtaLink } = fields || {};
  const videoUrl = String(VideoUrl?.value || '');
  const ctaLabelValue = String(CtaLabel?.value || '');
  const ctaHrefValue = String(CtaLink?.value?.href || '#');

  const stats = [
    { title: fields.stat1Title, subtitle: fields.stat1Subtitle },
    { title: fields.stat2Title, subtitle: fields.stat2Subtitle },
    { title: fields.stat3Title, subtitle: fields.stat3Subtitle },
    { title: fields.stat4Title, subtitle: fields.stat4Subtitle },
  ];

  return (
    <section
      data-component="HeroHomepage"
      id={id ? id : undefined}
      className="w-full relative min-h-[600px] md:min-h-[800px] lg:min-h-[1158px] overflow-hidden font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: '#001a70' }}
    >
      {/* Background image */}
      {(BackgroundImage?.value?.src || isPageEditing) && (
        <ContentSdkImage
          field={{
            ...BackgroundImage,
            value: {
              ...BackgroundImage?.value,
              style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
            },
          }}
        />
      )}

      {/* Video background — hidden in editing mode */}
      {videoUrl && !isPageEditing && (
        <video className="absolute inset-0 w-full h-full object-cover z-[1]" autoPlay muted loop playsInline src={videoUrl} />
      )}

      {/* Overlay — pointer-events-none in editing so image is clickable */}
      <div
        className={`absolute inset-0 z-10 ${isPageEditing ? 'pointer-events-none opacity-30' : ''}`}
        style={{ backgroundColor: 'rgba(0,26,112,0.55)' }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[20px] pt-[120px] md:pt-[180px] lg:pt-[300px] pb-[40px] lg:pb-[48px] flex flex-col justify-end min-h-[600px] md:min-h-[800px] lg:min-h-[1158px]">
        <div className="max-w-[900px]">
          {(Heading?.value || isPageEditing) && (
            <Text field={Heading} tag="h1" className="text-[40px] md:text-[70px] lg:text-[100px] font-[700] leading-[1.1] lg:leading-[120px] text-white mb-[16px] lg:mb-[24px]" />
          )}
          {(Subheading?.value || isPageEditing) && (
            <Text field={Subheading} tag="h2" className="text-[20px] md:text-[30px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white mb-[16px] lg:mb-[24px]" />
          )}
          {(Description?.value || isPageEditing) && (
            <RichText field={Description} className="text-[14px] md:text-[15px] lg:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/90 mb-[24px] max-w-[800px]" />
          )}
          {(ctaLabelValue || isPageEditing) && (
            isPageEditing ? (
              <Text field={CtaLabel} tag="span" className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] font-[700] rounded-full px-[24px] py-[12px] mb-[40px] lg:mb-[60px]" />
            ) : (
              <a href={ctaHrefValue} className="inline-block bg-[#00bfb2] text-[#001a70] text-[14px] md:text-[16px] font-[700] leading-[24px] rounded-full px-[24px] py-[12px] hover:bg-white transition-all duration-300 mb-[40px] lg:mb-[60px]">
                {ctaLabelValue}
              </a>
            )
          )}
        </div>

        {/* Stats row — 4 fixed items */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] md:gap-[24px] lg:gap-[40px] mt-[20px] lg:mt-[40px]">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              {(stat.title?.value || isPageEditing) && (
                <Text field={stat.title} tag="div" className="text-[32px] md:text-[50px] lg:text-[80px] font-[700] leading-[1.1] lg:leading-[90px] text-white" />
              )}
              {(stat.subtitle?.value || isPageEditing) && (
                <Text field={stat.subtitle} tag="span" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/80 mt-[4px]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeroHomepageProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroHomepageDefault {...props} isPageEditing={isEditing} />;
};
