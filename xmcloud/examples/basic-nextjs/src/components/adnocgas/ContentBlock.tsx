'use client';

/**
 * ContentBlock — Content section with optional background image, heading, description, item grid, CTA
 * Sitecore fields: Heading, Description, BackgroundImage, CtaLabel, CtaLink, item1-3 x (Title, Description)
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
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface ContentBlockParams {
  [key: string]: string;
}

export interface ContentBlockFields {
  Heading?: TextField;
  Description?: RichTextField;
  BackgroundImage?: ImageField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  item1Title?: TextField;
  item1Description?: TextField;
  item2Title?: TextField;
  item2Description?: TextField;
  item3Title?: TextField;
  item3Description?: TextField;
}

export interface ContentBlockProps extends ComponentProps {
  params: ContentBlockParams;
  fields: ContentBlockFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const ContentBlockDefault = (
  props: ContentBlockProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component content-block" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">ContentBlock</span>
        </div>
      </section>
    );
  }

  const hasBg = !!fields.BackgroundImage?.value?.src;

  const items = [1, 2, 3].map((n) => ({
    title: (fields as Record<string, unknown>)[`item${n}Title`] as TextField | undefined,
    description: (fields as Record<string, unknown>)[`item${n}Description`] as TextField | undefined,
  })).filter((item) => item.title?.value || isPageEditing);

  return (
    <section
      data-component="ContentBlock"
      id={id ? id : undefined}
      className="content-block-section w-full relative py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: hasBg ? '#003341' : '#ffffff' }}
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

      {hasBg && (
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,51,65,0.8)' }} />
      )}

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h3" className={`text-[24px] md:text-[30px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] mb-[16px] lg:mb-[24px] ${hasBg ? 'text-white' : 'text-[#003341]'}`} />
        )}
        {(fields.Description?.value || isPageEditing) && (
          <RichText field={fields.Description} className={`text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] mb-[24px] max-w-[800px] ${hasBg ? 'text-white/90' : 'text-[#505557]'}`} />
        )}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px] md:gap-[20px] lg:gap-[24px] mb-[24px]">
            {items.map((item, i) => (
              <div key={i} className={`p-[20px] md:p-[24px] rounded-[4px] ${hasBg ? 'bg-white/10' : 'bg-[#f6f6f6]'}`}>
                {(item.title?.value || isPageEditing) && (
                  <Text field={item.title} tag="h4" className={`text-[18px] md:text-[20px] font-[700] leading-[1.3] mb-[8px] ${hasBg ? 'text-white' : 'text-[#003341]'}`} />
                )}
                {(item.description?.value || isPageEditing) && (
                  <Text field={item.description} tag="p" className={`text-[14px] md:text-[16px] font-[400] leading-[1.5] ${hasBg ? 'text-white/80' : 'text-[#505557]'}`} />
                )}
              </div>
            ))}
          </div>
        )}
        {(fields.CtaLabel?.value || isPageEditing) && (
          isPageEditing ? (
            <Text field={fields.CtaLabel} tag="span" className={`text-[16px] font-[800] leading-[24px] uppercase ${hasBg ? 'text-[#00bfb2]' : 'text-[#008cb1]'}`} />
          ) : (
            <a href={String(fields.CtaLink?.value?.href || '#')} className={`text-[16px] font-[800] leading-[24px] transition-colors duration-200 uppercase ${hasBg ? 'text-[#00bfb2] hover:text-white' : 'text-[#008cb1] hover:text-[#003341]'}`}>
              {String(fields.CtaLabel?.value || '')}
            </a>
          )
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<ContentBlockProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ContentBlockDefault {...props} isPageEditing={isEditing} />;
};
