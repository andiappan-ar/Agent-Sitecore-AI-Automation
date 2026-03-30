'use client';

/**
 * SplitContent — Full-width background image section with heading, description, and CTA
 * Used for both left-aligned and centered dark-overlay layouts with different datasources.
 * Template: SplitContent ({9b675f0b-fc40-49ad-9657-2c778b653e49})
 *   - Heading     (Single-Line Text)
 *   - Description (Rich Text)
 * Rendering: SplitContent ({4876fdc1-fa23-49dc-b429-de44177a16d3})
 *
 * Note: Template currently only has Heading + Description. BackgroundImage, CtaLabel,
 * and CtaLink are included as optional fields for future template expansion.
 * Until those fields exist on the template, the CTA and background will not render.
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  RichText,
  RichTextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SplitContentParams {
  [key: string]: string;
}

export interface SplitContentFields {
  Heading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: TextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
}

export interface SplitContentProps extends ComponentProps {
  params: SplitContentParams;
  fields: SplitContentFields;
  isPageEditing?: boolean;
}

// ─── Inner ──────────────────────────────────────────────────────────────────────

const Inner = (props: SplitContentProps): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component split-content" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">SplitContent</span>
        </div>
      </section>
    );
  }

  const bgUrl = String(fields.BackgroundImage?.value || '');
  const ctaHref = String(fields.CtaLink?.value?.href || '#');

  return (
    <section
      data-component="SplitContent"
      id={id ? id : undefined}
      className="split-content-section relative w-full h-auto lg:h-[515px] py-[80px] lg:py-[150px] overflow-hidden bg-cover bg-center bg-no-repeat font-['ADNOC_Sans',sans-serif]"
      style={{
        backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
        backgroundColor: '#1a2030',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-[1] w-full max-w-[1400px] px-[7.5px] mx-auto">
        <div className="flex flex-row flex-wrap justify-center mx-[-7.5px]">
          <div className="relative w-full lg:w-[1166.66px] max-w-full px-[7.5px]">
            <div className="relative w-full max-w-full">
              <div className="relative w-full max-w-full">
                {(fields.Heading?.value || isPageEditing) && (
                  <Text
                    field={fields.Heading}
                    tag="h2"
                    className="w-full max-w-full mb-[25px] text-white text-[40px] font-[700] leading-[48px]"
                  />
                )}
                <div className="relative w-full max-w-full text-white">
                  {(fields.Description?.value || isPageEditing) && (
                    <RichText
                      field={fields.Description}
                      className="w-full md:w-[563.828px] mb-[25px] text-[16px] font-[400] leading-[24px]"
                    />
                  )}
                </div>
                {(fields.CtaLabel?.value || isPageEditing) && (
                  isPageEditing ? (
                    <Text
                      field={fields.CtaLabel}
                      tag="span"
                      className="inline-block w-[178px] min-w-[178px] py-[11.5px] px-[15px] mt-[24px] bg-[#008cb1] border border-[rgb(0,140,177)] text-white text-[18px] font-[700] leading-[21px] uppercase text-center"
                    />
                  ) : (
                    <a
                      href={ctaHref}
                      className="inline-block w-[178px] min-w-[178px] py-[11.5px] px-[15px] mt-[24px] bg-[#008cb1] border border-[rgb(0,140,177)] text-white text-[18px] font-[700] leading-[21px] uppercase text-center hover:bg-[#006681] transition-colors duration-300"
                    >
                      <Text field={fields.CtaLabel} tag="span" />
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variant ───────────────────────────────────────────────────────────

export const Default: React.FC<SplitContentProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <Inner {...props} isPageEditing={isEditing} />;
};
