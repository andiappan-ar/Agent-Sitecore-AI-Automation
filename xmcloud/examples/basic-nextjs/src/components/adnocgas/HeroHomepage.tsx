'use client';

/**
 * HeroHomepage — Full-screen hero with bg image/video, heading, CTA, 4 stats
 * Converted from scrapper Hero.jsx — exact same markup, Content SDK fields for editable content.
 * Template: HeroVideo ({d4b3c51e36784cbd84d2e0aab3be8c59})
 * Rendering: HeroHomepage ({6c82126efbc1497dbea3076c1194053f})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  RichText,
  RichTextField,
  ImageField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface HeroHomepageParams { [key: string]: string; }

export interface HeroHomepageFields {
  Heading?: TextField;
  Subheading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  VideoUrl?: TextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  stat1Title?: TextField;
  stat1Value?: TextField;
  stat1Unit?: TextField;
  stat1Subtitle?: TextField;
  stat2Title?: TextField;
  stat2Value?: TextField;
  stat2Unit?: TextField;
  stat2Subtitle?: TextField;
  stat3Title?: TextField;
  stat3Value?: TextField;
  stat3Unit?: TextField;
  stat3Subtitle?: TextField;
  stat4Title?: TextField;
  stat4Value?: TextField;
  stat4Unit?: TextField;
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
        <div className="component-content"><span className="is-empty-hint">HeroHomepage</span></div>
      </section>
    );
  }

  const { Heading, Subheading, Description, BackgroundImage, VideoUrl, CtaLabel, CtaLink } = fields || {};

  // Background image URL — rewrite hostname for local dev
  const rawBgSrc = BackgroundImage?.value?.src || '';
  const bgSrc = rawBgSrc
    ? rawBgSrc.replace(/https?:\/\/adnocgas\.localhost/, 'https://xmcloudcm.localhost')
    : 'https://www.adnocgas.ae/-/media/gas/images/home/animated-hero-banner/hero-bg.ashx';

  const videoUrl = String(VideoUrl?.value || '');
  const ctaLabelValue = String(CtaLabel?.value || '');
  const ctaHrefValue = String(CtaLink?.value?.href || '#');

  const stats = [
    { value: fields.stat1Value, unit: fields.stat1Unit, subtitle: fields.stat1Subtitle },
    { value: fields.stat2Value, unit: fields.stat2Unit, subtitle: fields.stat2Subtitle },
    { value: fields.stat3Value, unit: fields.stat3Unit, subtitle: fields.stat3Subtitle },
    { value: fields.stat4Value, unit: fields.stat4Unit, subtitle: fields.stat4Subtitle },
  ].filter(s => s.value?.value || isPageEditing);

  // ── EXACT markup from scrapper Hero.jsx, with Sitecore fields ──

  return (
    <section
      data-component="HeroHomepage"
      id={id ? id : undefined}
      className="hero-section relative w-full min-h-screen lg:h-[1158px] pt-[150px] lg:pt-[300px] pb-[80px] lg:pb-[28px] bg-cover bg-center bg-no-repeat font-['ADNOC_Sans',sans-serif] text-white overflow-hidden"
      style={{
        backgroundImage: bgSrc ? `url("${bgSrc}")` : undefined,
        backgroundColor: '#001a70',
      }}
    >
      {/* Video background */}
      {videoUrl && !isPageEditing && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay */}
      <div className={`absolute inset-0 bg-black/50 ${isPageEditing ? 'pointer-events-none opacity-30' : ''}`} />

      {/* Background color fallback */}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: '#001a70' }} />

      {/* Content container */}
      <div className="relative z-[1] w-full max-w-[1400px] mx-auto px-[7.5px]">
        <div className="w-full max-w-full">
          {/* Heading row */}
          <div className="flex flex-row flex-wrap w-full mx-[-7.5px]">
            <div className="relative w-full lg:w-[75%] max-w-full px-[7.5px]">
              {(Heading?.value || isPageEditing) && (
                <Text
                  field={Heading}
                  tag="h1"
                  className="w-full max-w-full mb-[20px] lg:mb-[40px] text-[50px] md:text-[70px] lg:text-[100px] font-[700] leading-[1.2] lg:leading-[120px]"
                />
              )}
            </div>
          </div>

          {/* Subheading + description row */}
          <div className="flex flex-row flex-wrap w-full mx-[-7.5px]">
            <div className="relative w-full lg:w-[75%] max-w-full px-[7.5px]">
              {(Subheading?.value || isPageEditing) && (
                <Text
                  field={Subheading}
                  tag="h2"
                  className="w-full max-w-full mb-[20px] lg:mb-[40px] text-[24px] md:text-[32px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px]"
                />
              )}

              {(Description?.value || isPageEditing) && (
                <RichText
                  field={Description}
                  className="w-full max-w-full text-[14px] lg:text-[16px] leading-[22px] lg:leading-[24px] text-white/90 mb-[25px]"
                />
              )}

              {/* CTA Button */}
              {(ctaLabelValue || isPageEditing) && (
                <div className="mb-[25px]">
                  {isPageEditing ? (
                    <Text
                      field={CtaLabel}
                      tag="span"
                      className="inline-block px-[20px] py-[10px] border border-[#ffb800] text-[#ffb800] text-[14px] lg:text-[16px] font-[700] rounded-full"
                    />
                  ) : (
                    <a
                      href={ctaHrefValue}
                      className="inline-block px-[20px] py-[10px] border border-[#ffb800] text-[#ffb800] text-[14px] lg:text-[16px] font-[700] rounded-full hover:bg-[#ffb800] hover:text-[#001a70] transition-colors duration-300"
                    >
                      {ctaLabelValue}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          {stats.length > 0 && (
            <div className="w-full max-w-full pt-[28px] px-[7.5px] mt-[20px] lg:mt-[40px]">
              <div className="flex flex-col md:flex-row flex-wrap w-full">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className="w-full md:w-1/2 lg:w-auto lg:min-w-[260px] px-[25px] mb-[30px] lg:mb-0"
                  >
                    {/* Value row — large number + small unit, both editable */}
                    <div className="flex flex-row items-end text-[50px] md:text-[60px] lg:text-[80px] font-[700] leading-[1.1] lg:leading-[90px] h-auto lg:h-[90px]">
                      {(stat.value?.value || isPageEditing) && (
                        <Text field={stat.value} tag="span" />
                      )}
                      {(stat.unit?.value || isPageEditing) && (
                        <Text
                          field={stat.unit}
                          tag="span"
                          className="mb-[15px] ml-[10px] text-[18px] md:text-[20px] lg:text-[23px] font-[400] leading-[28px]"
                        />
                      )}
                    </div>
                    {/* Stat label — editable */}
                    {(stat.subtitle?.value || isPageEditing) && (
                      <Text
                        field={stat.subtitle}
                        tag="div"
                        className="w-full max-w-[260px] text-[20px] md:text-[24px] lg:text-[28px] leading-[1.2] lg:leading-[33px] mt-[5px]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <svg
        className="hidden lg:inline absolute bottom-[20px] left-1/2 -translate-x-1/2 w-[40px] h-[40px] text-white animate-bounce"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<HeroHomepageProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <HeroHomepageDefault {...props} isPageEditing={isEditing} />;
};
