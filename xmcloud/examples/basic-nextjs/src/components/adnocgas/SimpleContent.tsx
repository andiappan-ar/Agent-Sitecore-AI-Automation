'use client';

/**
 * SimpleContent — Simple content block with heading, description, and rich text
 * Sitecore fields: Heading, Description, Content
 * Template: ContentSection ({f04b7bdc079d45dc85c1d862d4d1cf39})
 * Rendering: ContentSection ({e46f18f84a1341e5975768100a011985})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  RichText,
  RichTextField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface SimpleContentParams {
  [key: string]: string;
}

export interface SimpleContentFields {
  Heading?: TextField;
  Description?: RichTextField;
  Content?: RichTextField;
}

export interface SimpleContentProps extends ComponentProps {
  params: SimpleContentParams;
  fields: SimpleContentFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const SimpleContentDefault = (
  props: SimpleContentProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component simple-content" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">SimpleContent</span>
        </div>
      </section>
    );
  }

  return (
    <section data-component="SimpleContent" id={id ? id : undefined} className="simple-content-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="max-w-[800px]">
          {(fields.Heading?.value || isPageEditing) && (
            <Text field={fields.Heading} tag="h3" className="text-[24px] md:text-[30px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[16px] lg:mb-[24px]" />
          )}
          {(fields.Description?.value || isPageEditing) && (
            <RichText field={fields.Description} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] mb-[16px]" />
          )}
          {(fields.Content?.value || isPageEditing) && (
            <RichText field={fields.Content} className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-[#505557] space-y-[16px]" />
          )}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<SimpleContentProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <SimpleContentDefault {...props} isPageEditing={isEditing} />;
};
