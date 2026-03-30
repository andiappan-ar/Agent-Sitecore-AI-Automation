'use client';

/**
 * CardGrid — Grid of image cards with hover-reveal descriptions and CTA buttons
 * Each card has a background image, title, description, and explore link.
 * Template: CardGrid ({50cef7b9-862f-4ca3-90ce-2e3ee6b48c80})
 * Rendering: CardGrid ({49efa383-672a-4efc-9a15-7469dd8dad90})
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

// ─── Props ──────────────────────────────────────────────────────────────────────

interface CardGridParams {
  [key: string]: string;
}

export interface CardGridFields {
  Heading?: TextField;
  Description?: RichTextField;
  Cta?: LinkField;
  card1Title?: TextField;
  card1Description?: TextField;
  card1Link?: LinkField;
  card1BgImage?: TextField;
  card2Title?: TextField;
  card2Description?: TextField;
  card2Link?: LinkField;
  card2BgImage?: TextField;
  card3Title?: TextField;
  card3Description?: TextField;
  card3Link?: LinkField;
  card3BgImage?: TextField;
  card4Title?: TextField;
  card4Description?: TextField;
  card4Link?: LinkField;
  card4BgImage?: TextField;
  card5Title?: TextField;
  card5Description?: TextField;
  card5Link?: LinkField;
  card5BgImage?: TextField;
}

export interface CardGridProps extends ComponentProps {
  params: CardGridParams;
  fields: CardGridFields;
  isPageEditing?: boolean;
}

// ─── Card sub-component ─────────────────────────────────────────────────────────

function CardItem({
  title,
  description,
  link,
  bgImage,
  isEditing,
}: {
  title?: TextField;
  description?: TextField;
  link?: LinkField;
  bgImage?: TextField;
  isEditing?: boolean;
}) {
  if (!title?.value && !isEditing) return null;

  const href = String(link?.value?.href || '#');
  const bgUrl = String(bgImage?.value || '');

  return (
    <div className="relative w-full md:w-1/2 max-w-full px-[7.5px]">
      <div
        className="group flex flex-row items-end relative z-[1] w-full h-[400px] p-[48px] mb-[10px] bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
          backgroundColor: '#003341',
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Full card clickable link */}
        {!isEditing && (
          <a
            href={href}
            className="absolute inset-0 z-[999]"
            aria-label={String(title?.value || '')}
          />
        )}

        {/* Content area */}
        <div className="flex flex-col relative z-[1] w-full max-w-[575px] text-white overflow-hidden">
          <Text
            field={title}
            tag="h3"
            className="relative z-[1] w-full mb-[6.25px] text-[40px] font-[700] leading-[48px]"
          />
          <div className="relative w-full max-h-0 group-hover:max-h-[300px] overflow-hidden transition-all duration-500 ease-in-out">
            <Text
              field={description}
              tag="p"
              className="relative z-[1] w-full max-w-[575px] mb-[32px] font-[700] text-[16px] leading-[24px]"
            />
            {!isEditing ? (
              <a
                href={href}
                className="inline-block w-[178px] min-w-[178px] py-[11.5px] px-[15px] bg-[#008cb1] border border-[rgb(0,140,177)] text-white text-[18px] font-[700] leading-[21px] uppercase text-center hover:bg-[#006681] transition-colors duration-300"
              >
                Explore
              </a>
            ) : (
              <span className="inline-block w-[178px] min-w-[178px] py-[11.5px] px-[15px] bg-[#008cb1] border border-[rgb(0,140,177)] text-white text-[18px] font-[700] leading-[21px] uppercase text-center">
                Explore
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const CardGridInner = (
  props: CardGridProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component card-grid" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">CardGrid</span>
        </div>
      </section>
    );
  }

  const cards = [
    { title: fields.card1Title, description: fields.card1Description, link: fields.card1Link, bgImage: fields.card1BgImage },
    { title: fields.card2Title, description: fields.card2Description, link: fields.card2Link, bgImage: fields.card2BgImage },
    { title: fields.card3Title, description: fields.card3Description, link: fields.card3Link, bgImage: fields.card3BgImage },
    { title: fields.card4Title, description: fields.card4Description, link: fields.card4Link, bgImage: fields.card4BgImage },
    { title: fields.card5Title, description: fields.card5Description, link: fields.card5Link, bgImage: fields.card5BgImage },
  ].filter((c) => c.title?.value || isPageEditing);

  return (
    <section
      data-component="CardGrid"
      id={id ? id : undefined}
      className="card-grid-section w-full max-w-[1400px] mx-auto px-[7.5px] font-['ADNOC_Sans',sans-serif] text-[#505557] text-[16px] font-[400] leading-[24px]"
    >
      <div className="w-full max-w-full">
        <div className="flex flex-col md:flex-row md:flex-wrap mx-[-7.5px]">
          {cards.map((card, idx) => (
            <CardItem
              key={idx}
              title={card.title}
              description={card.description}
              link={card.link}
              bgImage={card.bgImage}
              isEditing={isPageEditing}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<CardGridProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <CardGridInner {...props} isPageEditing={isEditing} />;
};
