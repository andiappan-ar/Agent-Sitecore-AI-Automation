'use client';

/**
 * TwoColumnSection — Two-column layout with text on one side, image + stats on other
 * Sitecore fields: Heading, Description, Image, stat1-4 x (Value, Prefix, Suffix, Label)
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
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface TwoColumnSectionParams {
  [key: string]: string;
}

export interface TwoColumnSectionFields {
  Heading?: TextField;
  Description?: RichTextField;
  Image?: ImageField;
  stat1Value?: TextField;
  stat1Prefix?: TextField;
  stat1Suffix?: TextField;
  stat1Label?: TextField;
  stat2Value?: TextField;
  stat2Prefix?: TextField;
  stat2Suffix?: TextField;
  stat2Label?: TextField;
  stat3Value?: TextField;
  stat3Prefix?: TextField;
  stat3Suffix?: TextField;
  stat3Label?: TextField;
  stat4Value?: TextField;
  stat4Prefix?: TextField;
  stat4Suffix?: TextField;
  stat4Label?: TextField;
}

export interface TwoColumnSectionProps extends ComponentProps {
  params: TwoColumnSectionParams;
  fields: TwoColumnSectionFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const TwoColumnSectionDefault = (
  props: TwoColumnSectionProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component two-column-section" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">TwoColumnSection</span>
        </div>
      </section>
    );
  }

  const stats = [1, 2, 3, 4].map((n) => ({
    value: (fields as Record<string, unknown>)[`stat${n}Value`] as TextField | undefined,
    prefix: (fields as Record<string, unknown>)[`stat${n}Prefix`] as TextField | undefined,
    suffix: (fields as Record<string, unknown>)[`stat${n}Suffix`] as TextField | undefined,
    label: (fields as Record<string, unknown>)[`stat${n}Label`] as TextField | undefined,
  })).filter((s) => s.value?.value || isPageEditing);

  return (
    <section data-component="TwoColumnSection" id={id ? id : undefined} className="two-column-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[40px] items-start">
          {/* Text content */}
          <div className="w-full lg:w-1/2">
            {(fields.Heading?.value || isPageEditing) && (
              <Text field={fields.Heading} tag="h2" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[16px] lg:mb-[24px]" />
            )}
            {(fields.Description?.value || isPageEditing) && (
              <RichText field={fields.Description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557]" />
            )}
          </div>
          {/* Image + stats */}
          <div className="w-full lg:w-1/2">
            {(fields.Image?.value?.src || isPageEditing) && (
              <ContentSdkImage
                field={{
                  ...fields.Image,
                  value: {
                    ...fields.Image?.value,
                    style: { width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'cover', marginBottom: '24px' },
                  },
                }}
              />
            )}
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-[16px] md:gap-[24px]">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[32px] md:text-[48px] lg:text-[56px] font-[700] leading-[1.1] text-[#003341]">
                      {(stat.prefix?.value || isPageEditing) && (
                        <Text field={stat.prefix} tag="span" />
                      )}
                      {(stat.value?.value || isPageEditing) && (
                        <Text field={stat.value} tag="span" />
                      )}
                      {(stat.suffix?.value || isPageEditing) && (
                        <Text field={stat.suffix} tag="span" className="text-[20px] md:text-[28px] font-[400]" />
                      )}
                    </div>
                    {(stat.label?.value || isPageEditing) && (
                      <Text field={stat.label} tag="span" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<TwoColumnSectionProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <TwoColumnSectionDefault {...props} isPageEditing={isEditing} />;
};
