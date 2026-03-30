'use client';

/**
 * Hero — Generic hero with background image/video, heading, CTAs, and stats
 * Sitecore fields: Heading, Subheading, Description, BackgroundImage, VideoUrl, Cta1Label, Cta1Link, Cta2Label, Cta2Link, stat1-4 x (Value, Suffix, Label)
 * Template: HeroCentered ({3b7217d269de4b179c2ca7d7d7c26d9b})
 * Rendering: HeroCentered ({99e40b86b568433884150eb008a08a99})
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

interface HeroParams {
  [key: string]: string;
}

export interface HeroFields {
  Heading?: TextField;
  Subheading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  VideoUrl?: TextField;
  Cta1Label?: TextField;
  Cta1Link?: LinkField;
  Cta2Label?: TextField;
  Cta2Link?: LinkField;
  stat1Value?: TextField;
  stat1Suffix?: TextField;
  stat1Label?: TextField;
  stat2Value?: TextField;
  stat2Suffix?: TextField;
  stat2Label?: TextField;
  stat3Value?: TextField;
  stat3Suffix?: TextField;
  stat3Label?: TextField;
  stat4Value?: TextField;
  stat4Suffix?: TextField;
  stat4Label?: TextField;
}

export interface HeroProps extends ComponentProps {
  params: HeroParams;
  fields: HeroFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const HeroDefault = (
  props: HeroProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component hero" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Hero</span>
        </div>
      </section>
    );
  }

  const videoUrl = String(fields.VideoUrl?.value || '');

  const stats = [
    { value: fields.stat1Value, suffix: fields.stat1Suffix, label: fields.stat1Label },
    { value: fields.stat2Value, suffix: fields.stat2Suffix, label: fields.stat2Label },
    { value: fields.stat3Value, suffix: fields.stat3Suffix, label: fields.stat3Label },
    { value: fields.stat4Value, suffix: fields.stat4Suffix, label: fields.stat4Label },
  ].filter((s) => s.value?.value || isPageEditing);

  return (
    <section
      data-component="Hero"
      id={id ? id : undefined}
      className="w-full relative flex flex-col justify-center min-h-screen"
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

      {/* Video background */}
      {videoUrl && !isPageEditing && (
        <>
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
            <source src={videoUrl} type="video/mp4" />
          </video>
        </>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px] pt-[120px] pb-[80px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h1" className="text-[36px] md:text-[52px] lg:text-[64px] font-[700] leading-[1.1] text-white max-w-[800px]" />
        )}
        {(fields.Subheading?.value || isPageEditing) && (
          <Text field={fields.Subheading} tag="h2" className="text-[20px] lg:text-[28px] font-[400] text-white/90 mt-[16px]" />
        )}
        {(fields.Description?.value || isPageEditing) && (
          <RichText field={fields.Description} className="text-[16px] lg:text-[18px] font-[400] leading-[28px] text-white/85 mt-[20px] max-w-[640px]" />
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-[12px] mt-[32px]">
          {(fields.Cta1Label?.value || isPageEditing) && (
            isPageEditing ? (
              <Text field={fields.Cta1Label} tag="span" className="inline-block px-[28px] py-[14px] rounded-full text-[15px] font-[600] bg-[var(--color-accent)] text-[var(--color-primary)]" />
            ) : (
              <a href={String(fields.Cta1Link?.value?.href || '#')} className="inline-block px-[28px] py-[14px] rounded-full text-[15px] font-[600] transition-all duration-300 bg-[var(--color-accent)] text-[var(--color-primary)] hover:bg-white">
                {String(fields.Cta1Label?.value || '')}
              </a>
            )
          )}
          {(fields.Cta2Label?.value || isPageEditing) && (
            isPageEditing ? (
              <Text field={fields.Cta2Label} tag="span" className="inline-block px-[28px] py-[14px] rounded-full text-[15px] font-[600] border border-white text-white" />
            ) : (
              <a href={String(fields.Cta2Link?.value?.href || '#')} className="inline-block px-[28px] py-[14px] rounded-full text-[15px] font-[600] transition-all duration-300 border border-white text-white hover:bg-white hover:text-[var(--color-primary)]">
                {String(fields.Cta2Label?.value || '')}
              </a>
            )
          )}
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[24px] mt-[48px]">
            {stats.map((stat, i) => (
              <div key={i} className="text-white">
                <span className="text-[40px] lg:text-[56px] font-[700] leading-[1]">
                  {(stat.value?.value || isPageEditing) && (
                    <Text field={stat.value} tag="span" />
                  )}
                  {(stat.suffix?.value || isPageEditing) && (
                    <Text field={stat.suffix} tag="span" />
                  )}
                </span>
                {(stat.label?.value || isPageEditing) && (
                  <Text field={stat.label} tag="span" className="text-[13px] font-[400] text-white/70 block mt-[4px] uppercase tracking-[1px]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeroProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroDefault {...props} isPageEditing={isEditing} />;
};
