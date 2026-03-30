'use client';

/**
 * PartnerCarousel — Logo carousel for partner/client logos with pagination dots
 * Sitecore fields: Heading, partner1-8 x (Name, Image)
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
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface PartnerCarouselParams {
  [key: string]: string;
}

export interface PartnerCarouselFields {
  Heading?: TextField;
  partner1Name?: TextField;
  partner1Image?: ImageField;
  partner2Name?: TextField;
  partner2Image?: ImageField;
  partner3Name?: TextField;
  partner3Image?: ImageField;
  partner4Name?: TextField;
  partner4Image?: ImageField;
  partner5Name?: TextField;
  partner5Image?: ImageField;
  partner6Name?: TextField;
  partner6Image?: ImageField;
  partner7Name?: TextField;
  partner7Image?: ImageField;
  partner8Name?: TextField;
  partner8Image?: ImageField;
}

export interface PartnerCarouselProps extends ComponentProps {
  params: PartnerCarouselParams;
  fields: PartnerCarouselFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const PartnerCarouselDefault = (
  props: PartnerCarouselProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [current, setCurrent] = useState(0);

  if (!fields) {
    return (
      <section className="component partner-carousel" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">PartnerCarousel</span>
        </div>
      </section>
    );
  }

  const partners = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    name: (fields as Record<string, unknown>)[`partner${n}Name`] as TextField | undefined,
    image: (fields as Record<string, unknown>)[`partner${n}Image`] as ImageField | undefined,
  })).filter((p) => p.name?.value || p.image?.value?.src || isPageEditing);

  const itemsPerView = 4;
  const totalPages = Math.max(1, Math.ceil(partners.length / itemsPerView));

  return (
    <section data-component="PartnerCarousel" id={id ? id : undefined} className="partner-carousel-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h3" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[24px] lg:mb-[40px] text-center" />
        )}

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {partners.map((partner, i) => (
              <div key={i} className="w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 px-[12px]">
                <div className="flex items-center justify-center h-[80px] md:h-[100px] lg:h-[120px]">
                  {(partner.image?.value?.src || isPageEditing) && partner.image ? (
                    <ContentSdkImage
                      field={{
                        ...partner.image,
                        value: {
                          ...partner.image?.value,
                          style: { maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' },
                        },
                      }}
                    />
                  ) : (
                    (partner.name?.value || isPageEditing) && (
                      <Text field={partner.name} tag="span" className="text-[16px] font-[700] text-[#003341]" />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-[8px] mt-[24px]">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${current === i ? 'w-[24px] h-[8px] bg-[#003341]' : 'w-[8px] h-[8px] bg-[#c4c4c4]'}`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<PartnerCarouselProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <PartnerCarouselDefault {...props} isPageEditing={isEditing} />;
};
