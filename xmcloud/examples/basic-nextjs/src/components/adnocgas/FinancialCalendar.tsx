'use client';

/**
 * FinancialCalendar — Event listing with date/title rows and optional CTA
 * Sitecore fields: Heading, CtaLabel, CtaLink, event1-6 x (Date, Title)
 * Template: ContentSection ({f04b7bdc079d45dc85c1d862d4d1cf39})
 * Rendering: ContentSection ({e46f18f84a1341e5975768100a011985})
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

interface FinancialCalendarParams {
  [key: string]: string;
}

export interface FinancialCalendarFields {
  Heading?: TextField;
  CtaLabel?: TextField;
  CtaLink?: LinkField;
  event1Date?: TextField;
  event1Title?: TextField;
  event2Date?: TextField;
  event2Title?: TextField;
  event3Date?: TextField;
  event3Title?: TextField;
  event4Date?: TextField;
  event4Title?: TextField;
  event5Date?: TextField;
  event5Title?: TextField;
  event6Date?: TextField;
  event6Title?: TextField;
}

export interface FinancialCalendarProps extends ComponentProps {
  params: FinancialCalendarParams;
  fields: FinancialCalendarFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const FinancialCalendarDefault = (
  props: FinancialCalendarProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component financial-calendar" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">FinancialCalendar</span>
        </div>
      </section>
    );
  }

  const events = [1, 2, 3, 4, 5, 6].map((n) => ({
    date: (fields as Record<string, unknown>)[`event${n}Date`] as TextField | undefined,
    title: (fields as Record<string, unknown>)[`event${n}Title`] as TextField | undefined,
  })).filter((e) => e.title?.value || isPageEditing);

  return (
    <section data-component="FinancialCalendar" id={id ? id : undefined} className="financial-calendar-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h3" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[24px] lg:mb-[32px]" />
        )}

        <div className="space-y-[16px]">
          {events.map((event, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center gap-[8px] md:gap-[24px] py-[16px] border-b border-[#dbdcdb]">
              <div className="shrink-0 w-full md:w-[180px]">
                {(event.date?.value || isPageEditing) && (
                  <Text field={event.date} tag="p" className="text-[16px] font-[700] leading-[24px] text-[#003341]" />
                )}
              </div>
              <div className="flex-1">
                {(event.title?.value || isPageEditing) && (
                  <Text field={event.title} tag="span" className="text-[16px] font-[400] leading-[24px] text-[#505557]" />
                )}
              </div>
            </div>
          ))}
        </div>

        {(fields.CtaLabel?.value || isPageEditing) && (
          <div className="mt-[32px]">
            {isPageEditing ? (
              <Text field={fields.CtaLabel} tag="span" className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] uppercase" />
            ) : (
              <a href={String(fields.CtaLink?.value?.href || '#')} className="inline-block bg-[#00bfb2] text-[#001a70] text-[16px] md:text-[18px] font-[700] leading-[22px] rounded-full px-[28px] py-[14px] hover:bg-[#001a70] hover:text-white transition-all duration-300 uppercase">
                {String(fields.CtaLabel?.value || '')}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<FinancialCalendarProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <FinancialCalendarDefault {...props} isPageEditing={isEditing} />;
};
