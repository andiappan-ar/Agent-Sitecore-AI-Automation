'use client';

/**
 * Breadcrumb — Horizontal breadcrumb navigation trail
 * Sitecore fields: item1-5 x (Label, Link)
 * Template: Breadcrumb ({a5ec0e543aaa4562b3aafa4792e50859})
 * Rendering: Breadcrumb ({9fb62639c7174b6a9d643546d3090cda})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  LinkField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface BreadcrumbParams {
  [key: string]: string;
}

export interface BreadcrumbFields {
  item1Label?: TextField;
  item1Link?: LinkField;
  item2Label?: TextField;
  item2Link?: LinkField;
  item3Label?: TextField;
  item3Link?: LinkField;
  item4Label?: TextField;
  item4Link?: LinkField;
  item5Label?: TextField;
  item5Link?: LinkField;
}

export interface BreadcrumbProps extends ComponentProps {
  params: BreadcrumbParams;
  fields: BreadcrumbFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const BreadcrumbDefault = (
  props: BreadcrumbProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component breadcrumb" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">Breadcrumb</span>
        </div>
      </section>
    );
  }

  const items = [1, 2, 3, 4, 5].map((n) => ({
    label: (fields as Record<string, unknown>)[`item${n}Label`] as TextField | undefined,
    link: (fields as Record<string, unknown>)[`item${n}Link`] as LinkField | undefined,
  })).filter((item) => item.label?.value || isPageEditing);

  return (
    <section data-component="Breadcrumb" id={id ? id : undefined} className="breadcrumb-section w-full bg-white py-[12px] md:py-[16px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-[8px] text-[14px] font-[400] leading-[21px]">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-[8px]">
                {i > 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#c4c4c4]">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isPageEditing ? (
                  <Text field={item.label} tag="span" className="text-[#505557]" />
                ) : item.link?.value?.href && i < items.length - 1 ? (
                  <a href={String(item.link.value.href)} className="text-[#008cb1] hover:text-[#003341] transition-colors duration-200">
                    {String(item.label?.value || '')}
                  </a>
                ) : (
                  <span className="text-[#505557]">{String(item.label?.value || '')}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<BreadcrumbProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <BreadcrumbDefault {...props} isPageEditing={isEditing} />;
};
