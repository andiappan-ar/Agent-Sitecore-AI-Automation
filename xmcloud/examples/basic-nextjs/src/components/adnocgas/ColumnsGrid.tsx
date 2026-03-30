'use client';

/**
 * ColumnsGrid — 5 image overlay cards with hover-reveal description + Explore CTA
 * Exact structure from scrapper CardGrid.jsx, all content from Sitecore fields.
 * Template: CardGrid
 * Rendering: ColumnsGrid ({4a9d9ba728fa4eb493ba2df9d16d8f7f})
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

interface ColumnsGridParams { [key: string]: string; }

export interface ColumnsGridFields {
  Heading?: TextField;
  Description?: TextField;
  card1Title?: TextField; card1Description?: TextField; card1BgImage?: TextField; card1Link?: LinkField;
  card2Title?: TextField; card2Description?: TextField; card2BgImage?: TextField; card2Link?: LinkField;
  card3Title?: TextField; card3Description?: TextField; card3BgImage?: TextField; card3Link?: LinkField;
  card4Title?: TextField; card4Description?: TextField; card4BgImage?: TextField; card4Link?: LinkField;
  card5Title?: TextField; card5Description?: TextField; card5BgImage?: TextField; card5Link?: LinkField;
}

export interface ColumnsGridProps extends ComponentProps {
  params: ColumnsGridParams;
  fields: ColumnsGridFields;
  isPageEditing?: boolean;
}

const FALLBACK_IMAGES = [
  'https://www.adnocgas.ae/-/media/gas/images/hotspot-cards/our-operations.ashx?h=400&w=680',
  'https://www.adnocgas.ae/-/media/gas/images/hotspot-cards/sustainability-menu.ashx?h=395&w=673',
  'https://www.adnocgas.ae/-/media/gas/images/hotspot-cards/our-projects-menu.ashx?h=390&w=669',
  'https://www.adnocgas.ae/-/media/gas/images/hotspot-cards/innovation.ashx?h=400&w=680',
  'https://www.adnocgas.ae/-/media/gas/images/hotspot-cards/marketing-menu.ashx?h=390&w=668',
];

const ColumnsGridDefault = (
  props: ColumnsGridProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component columns-grid" id={id}>
        <div className="component-content"><span className="is-empty-hint">ColumnsGrid</span></div>
      </section>
    );
  }

  const cards = [
    { title: fields.card1Title, desc: fields.card1Description, bgImage: fields.card1BgImage, link: fields.card1Link, fallbackBg: FALLBACK_IMAGES[0] },
    { title: fields.card2Title, desc: fields.card2Description, bgImage: fields.card2BgImage, link: fields.card2Link, fallbackBg: FALLBACK_IMAGES[1] },
    { title: fields.card3Title, desc: fields.card3Description, bgImage: fields.card3BgImage, link: fields.card3Link, fallbackBg: FALLBACK_IMAGES[2] },
    { title: fields.card4Title, desc: fields.card4Description, bgImage: fields.card4BgImage, link: fields.card4Link, fallbackBg: FALLBACK_IMAGES[3] },
    { title: fields.card5Title, desc: fields.card5Description, bgImage: fields.card5BgImage, link: fields.card5Link, fallbackBg: FALLBACK_IMAGES[4] },
  ].filter(c => c.title?.value || isPageEditing);

  return (
    <section
      data-component="ColumnsGrid"
      id={id ? id : undefined}
      className="card-grid-section w-full max-w-[1400px] mx-auto px-[7.5px] font-['ADNOC_Sans',sans-serif] text-[#505557] text-[16px] font-[400] leading-[24px]"
    >
      <div className="w-full max-w-full">
        <div className="flex flex-col md:flex-row md:flex-wrap mx-[-7.5px]">
          {cards.map((card, idx) => {
            const bgUrl = String(card.bgImage?.value || card.fallbackBg);
            const href = String(card.link?.value?.href || '#');

            return (
              <div
                key={idx}
                className="relative w-full md:w-1/2 max-w-full px-[7.5px]"
              >
                <div
                  className="group flex flex-row items-end relative z-[1] w-full h-[400px] p-[48px] mb-[10px] bg-cover bg-center bg-no-repeat overflow-hidden"
                  style={{
                    backgroundImage: `url("${bgUrl}")`,
                    backgroundColor: '#003341',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                  {!isPageEditing && (
                    <a href={href} className="absolute inset-0 z-[999]" aria-label={String(card.title?.value || '')} />
                  )}

                  <div className="flex flex-col relative z-[1] w-full max-w-[575px] text-white overflow-hidden">
                    {(card.title?.value || isPageEditing) && (
                      <Text field={card.title} tag="h3" className="relative z-[1] w-full mb-[6.25px] text-[40px] font-[700] leading-[48px]" />
                    )}
                    <div className="relative w-full max-h-0 group-hover:max-h-[300px] overflow-hidden transition-all duration-500 ease-in-out">
                      {(card.desc?.value || isPageEditing) && (
                        <Text field={card.desc} tag="p" className="relative z-[1] w-full max-w-[575px] mb-[32px] font-[700] text-[16px] leading-[24px]" />
                      )}
                      <a
                        href={href}
                        className="inline-block w-[178px] min-w-[178px] py-[11.5px] px-[15px] bg-[#008cb1] border border-[rgb(0,140,177)] text-white text-[18px] font-[700] leading-[21px] uppercase text-center hover:bg-[#006681] transition-colors duration-300"
                      >
                        Explore
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const Default: React.FC<ColumnsGridProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <ColumnsGridDefault {...props} isPageEditing={isEditing} />;
};
