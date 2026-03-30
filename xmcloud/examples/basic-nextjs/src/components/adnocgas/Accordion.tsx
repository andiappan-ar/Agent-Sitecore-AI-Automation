'use client';

/**
 * Accordion — Simple content section with heading, description, images, and links
 * Sitecore fields: Heading, Description, Image1, Image2, link1Label, link1Link, link2Label, link2Link
 * Template: Accordion ({9682c7f43c3c4e65a5fbed7df924867d})
 * Rendering: Accordion ({7ec34c9f1de748b0a0738915485d4d55})
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

interface AccordionParams {
  [key: string]: string;
}

export interface AccordionFields {
  Heading?: TextField;
  Description?: RichTextField;
  Image1?: ImageField;
  Image2?: ImageField;
  link1Label?: TextField;
  link1Link?: LinkField;
  link2Label?: TextField;
  link2Link?: LinkField;
}

export interface AccordionProps extends ComponentProps {
  params: AccordionParams;
  fields: AccordionFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const AccordionDefault = (
  props: AccordionProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component accordion" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Accordion</span>
        </div>
      </section>
    );
  }

  const images = [fields.Image1, fields.Image2].filter((img) => img?.value?.src || isPageEditing);
  const links = [
    { label: fields.link1Label, link: fields.link1Link },
    { label: fields.link2Label, link: fields.link2Link },
  ].filter((lk) => lk.label?.value || isPageEditing);

  return (
    <section data-component="Accordion" id={id ? id : undefined} className="w-full bg-white py-[60px]">
      <div className="w-full max-w-[1200px] mx-auto px-[24px] lg:px-[44px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h2" className="text-[28px] lg:text-[36px] font-[700] text-[var(--color-primary)] mb-[24px]" />
        )}
        {(fields.Description?.value || isPageEditing) && (
          <RichText field={fields.Description} className="text-[16px] text-[#555] leading-[28px] max-w-[720px]" />
        )}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-[16px] mt-[24px]">
            {images.map((img, i) => (
              img && (
                <ContentSdkImage
                  key={i}
                  field={{
                    ...img,
                    value: {
                      ...img?.value,
                      style: { maxHeight: '200px', objectFit: 'contain' },
                    },
                  }}
                />
              )
            ))}
          </div>
        )}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-[12px] mt-[24px]">
            {links.map((lk, i) => (
              (lk.label?.value || isPageEditing) && (
                isPageEditing ? (
                  <Text key={i} field={lk.label} tag="span" className="text-[14px] font-[600] text-[var(--color-primary)] underline" />
                ) : (
                  <a key={i} href={String(lk.link?.value?.href || '#')} className="text-[14px] font-[600] text-[var(--color-primary)] hover:text-[var(--color-accent)] underline transition-colors">
                    {String(lk.label?.value || '')}
                  </a>
                )
              )
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<AccordionProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <AccordionDefault {...props} isPageEditing={isEditing} />;
};
