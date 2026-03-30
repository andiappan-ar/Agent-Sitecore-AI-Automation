'use client';

/**
 * InnovationSlider — Full-width slider with image + text slides and navigation dots
 * Sitecore fields: Heading, slide1-4 x (Image, Title, Description, CtaLabel, CtaLink)
 * Template: Carousel ({6adc31c81b6947458a50929274b24347})
 * Rendering: Carousel ({fb52d618c7114b7cbcc395e9977142e1})
 */

import type React from 'react';
import { type JSX } from 'react';
import { useState } from 'react';
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

interface InnovationSliderParams {
  [key: string]: string;
}

export interface InnovationSliderFields {
  Heading?: TextField;
  slide1Image?: ImageField;
  slide1Title?: TextField;
  slide1Description?: RichTextField;
  slide1CtaLabel?: TextField;
  slide1CtaLink?: LinkField;
  slide2Image?: ImageField;
  slide2Title?: TextField;
  slide2Description?: RichTextField;
  slide2CtaLabel?: TextField;
  slide2CtaLink?: LinkField;
  slide3Image?: ImageField;
  slide3Title?: TextField;
  slide3Description?: RichTextField;
  slide3CtaLabel?: TextField;
  slide3CtaLink?: LinkField;
  slide4Image?: ImageField;
  slide4Title?: TextField;
  slide4Description?: RichTextField;
  slide4CtaLabel?: TextField;
  slide4CtaLink?: LinkField;
}

export interface InnovationSliderProps extends ComponentProps {
  params: InnovationSliderParams;
  fields: InnovationSliderFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const InnovationSliderDefault = (
  props: InnovationSliderProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [current, setCurrent] = useState(0);

  if (!fields) {
    return (
      <section className="component innovation-slider" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">InnovationSlider</span>
        </div>
      </section>
    );
  }

  const slides = [1, 2, 3, 4].map((n) => ({
    image: (fields as Record<string, unknown>)[`slide${n}Image`] as ImageField | undefined,
    title: (fields as Record<string, unknown>)[`slide${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`slide${n}Description`] as RichTextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`slide${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`slide${n}CtaLink`] as LinkField | undefined,
  })).filter((s) => s.title?.value || isPageEditing);

  const total = slides.length || 1;

  return (
    <section data-component="InnovationSlider" id={id ? id : undefined} className="innovation-slider-section w-full bg-[#f6f6f6] py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h3" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[24px] lg:mb-[40px]" />
        )}

        <div className="relative">
          <div className="overflow-hidden rounded-[4px]">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {slides.map((slide, i) => (
                <div key={i} className="w-full flex-shrink-0">
                  <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[40px]">
                    {(slide.image?.value?.src || isPageEditing) && slide.image && (
                      <div className="w-full lg:w-1/2">
                        <ContentSdkImage
                          field={{
                            ...slide.image,
                            value: {
                              ...slide.image?.value,
                              style: { width: '100%', height: '400px', objectFit: 'cover', borderRadius: '4px' },
                            },
                          }}
                        />
                      </div>
                    )}
                    <div className="w-full lg:w-1/2 flex flex-col justify-center">
                      {(slide.title?.value || isPageEditing) && (
                        <Text field={slide.title} tag="h4" className="text-[22px] md:text-[28px] lg:text-[32px] font-[700] leading-[1.2] text-[#003341] mb-[16px]" />
                      )}
                      {(slide.description?.value || isPageEditing) && (
                        <RichText field={slide.description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[24px]" />
                      )}
                      {(slide.ctaLabel?.value || isPageEditing) && (
                        isPageEditing ? (
                          <Text field={slide.ctaLabel} tag="span" className="text-[16px] font-[800] leading-[24px] text-[#008cb1] uppercase" />
                        ) : (
                          <a href={String(slide.ctaLink?.value?.href || '#')} className="text-[16px] font-[800] leading-[24px] text-[#008cb1] hover:text-[#003341] transition-colors duration-200 uppercase">
                            {String(slide.ctaLabel?.value || '')}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-[16px] mt-[24px]">
              <button
                onClick={() => setCurrent((current - 1 + total) % total)}
                className="w-[40px] h-[40px] rounded-full border border-[#003341] flex items-center justify-center hover:bg-[#003341] hover:text-white transition-all duration-300 text-[#003341]"
                aria-label="Previous"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="flex gap-[8px]">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all duration-300 ${current === i ? 'w-[24px] h-[8px] bg-[#003341]' : 'w-[8px] h-[8px] bg-[#c4c4c4]'}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrent((current + 1) % total)}
                className="w-[40px] h-[40px] rounded-full border border-[#003341] flex items-center justify-center hover:bg-[#003341] hover:text-white transition-all duration-300 text-[#003341]"
                aria-label="Next"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<InnovationSliderProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <InnovationSliderDefault {...props} isPageEditing={isEditing} />;
};
