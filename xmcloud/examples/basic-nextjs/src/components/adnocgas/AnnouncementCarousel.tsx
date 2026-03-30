'use client';

/**
 * AnnouncementCarousel — Carousel of announcement cards with navigation arrows and dots
 * Sitecore fields: Heading, ViewAllLabel, ViewAllLink, slide1-4 x (Date, Title, CtaLabel, CtaLink)
 * Template: Carousel ({6adc31c81b6947458a50929274b24347})
 * Rendering: Carousel ({fb52d618c7114b7cbcc395e9977142e1})
 */

import type React from 'react';
import { type JSX } from 'react';
import { useState } from 'react';
import {
  Text,
  TextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface AnnouncementCarouselParams {
  [key: string]: string;
}

export interface AnnouncementCarouselFields {
  Heading?: TextField;
  ViewAllLabel?: TextField;
  ViewAllLink?: LinkField;
  slide1Date?: TextField;
  slide1Title?: TextField;
  slide1CtaLabel?: TextField;
  slide1CtaLink?: LinkField;
  slide2Date?: TextField;
  slide2Title?: TextField;
  slide2CtaLabel?: TextField;
  slide2CtaLink?: LinkField;
  slide3Date?: TextField;
  slide3Title?: TextField;
  slide3CtaLabel?: TextField;
  slide3CtaLink?: LinkField;
  slide4Date?: TextField;
  slide4Title?: TextField;
  slide4CtaLabel?: TextField;
  slide4CtaLink?: LinkField;
}

export interface AnnouncementCarouselProps extends ComponentProps {
  params: AnnouncementCarouselParams;
  fields: AnnouncementCarouselFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const AnnouncementCarouselDefault = (
  props: AnnouncementCarouselProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [current, setCurrent] = useState(0);

  if (!fields) {
    return (
      <section className="component announcement-carousel" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">AnnouncementCarousel</span>
        </div>
      </section>
    );
  }

  const slides = [1, 2, 3, 4].map((n) => ({
    date: (fields as Record<string, unknown>)[`slide${n}Date`] as TextField | undefined,
    title: (fields as Record<string, unknown>)[`slide${n}Title`] as TextField | undefined,
    ctaLabel: (fields as Record<string, unknown>)[`slide${n}CtaLabel`] as TextField | undefined,
    ctaLink: (fields as Record<string, unknown>)[`slide${n}CtaLink`] as LinkField | undefined,
  })).filter((s) => s.title?.value || isPageEditing);

  const total = slides.length || 1;

  return (
    <section data-component="AnnouncementCarousel" id={id ? id : undefined} className="announcement-carousel-section w-full bg-[#f6f6f6] py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="flex items-center justify-between mb-[24px] lg:mb-[32px]">
          {(fields.Heading?.value || isPageEditing) && (
            <Text field={fields.Heading} tag="h3" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341]" />
          )}
          <div className="flex items-center gap-[12px]">
            <button
              onClick={() => setCurrent((current - 1 + total) % total)}
              className="w-[40px] h-[40px] rounded-full border border-[#003341] flex items-center justify-center hover:bg-[#003341] hover:text-white transition-all duration-300 text-[#003341]"
              aria-label="Previous"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              onClick={() => setCurrent((current + 1) % total)}
              className="w-[40px] h-[40px] rounded-full border border-[#003341] flex items-center justify-center hover:bg-[#003341] hover:text-white transition-all duration-300 text-[#003341]"
              aria-label="Next"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="w-full flex-shrink-0 px-[8px]">
                <div className="bg-white rounded-[4px] p-[24px] md:p-[32px]">
                  {(slide.date?.value || isPageEditing) && (
                    <Text field={slide.date} tag="p" className="text-[14px] font-[400] leading-[21px] text-[#505557] mb-[12px]" />
                  )}
                  {(slide.title?.value || isPageEditing) && (
                    <Text field={slide.title} tag="p" className="text-[18px] md:text-[20px] font-[700] leading-[1.3] lg:leading-[32px] text-[#003341] mb-[16px]" />
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
            ))}
          </div>
        </div>

        {/* Dots */}
        {total > 1 && (
          <div className="flex justify-center gap-[8px] mt-[24px]">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${current === i ? 'w-[24px] h-[8px] bg-[#003341]' : 'w-[8px] h-[8px] bg-[#c4c4c4]'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {(fields.ViewAllLabel?.value || isPageEditing) && (
          <div className="mt-[24px] text-center">
            {isPageEditing ? (
              <Text field={fields.ViewAllLabel} tag="span" className="text-[16px] font-[800] leading-[24px] text-[#008cb1] uppercase" />
            ) : (
              <a href={String(fields.ViewAllLink?.value?.href || '#')} className="text-[16px] font-[800] leading-[24px] text-[#008cb1] hover:text-[#003341] transition-colors duration-200 uppercase">
                {String(fields.ViewAllLabel?.value || '')}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<AnnouncementCarouselProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <AnnouncementCarouselDefault {...props} isPageEditing={isEditing} />;
};
