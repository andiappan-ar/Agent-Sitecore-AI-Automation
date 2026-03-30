'use client';

/**
 * BoardMembers — Grid of board member cards with background images
 * Sitecore fields: Heading, member1-6 x (Name, Role, Image)
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
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface BoardMembersParams {
  [key: string]: string;
}

export interface BoardMembersFields {
  Heading?: TextField;
  member1Name?: TextField;
  member1Role?: TextField;
  member1Image?: ImageField;
  member2Name?: TextField;
  member2Role?: TextField;
  member2Image?: ImageField;
  member3Name?: TextField;
  member3Role?: TextField;
  member3Image?: ImageField;
  member4Name?: TextField;
  member4Role?: TextField;
  member4Image?: ImageField;
  member5Name?: TextField;
  member5Role?: TextField;
  member5Image?: ImageField;
  member6Name?: TextField;
  member6Role?: TextField;
  member6Image?: ImageField;
}

export interface BoardMembersProps extends ComponentProps {
  params: BoardMembersParams;
  fields: BoardMembersFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const BoardMembersDefault = (
  props: BoardMembersProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component board-members" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">BoardMembers</span>
        </div>
      </section>
    );
  }

  const members = [1, 2, 3, 4, 5, 6].map((n) => ({
    name: (fields as Record<string, unknown>)[`member${n}Name`] as TextField | undefined,
    role: (fields as Record<string, unknown>)[`member${n}Role`] as TextField | undefined,
    image: (fields as Record<string, unknown>)[`member${n}Image`] as ImageField | undefined,
  })).filter((m) => m.name?.value || isPageEditing);

  return (
    <section data-component="BoardMembers" id={id ? id : undefined} className="board-members-section w-full bg-white py-[40px] md:py-[60px] lg:py-[80px] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h2" className="text-[28px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-[#003341] mb-[32px] lg:mb-[48px]" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] lg:gap-[32px]">
          {members.map((member, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[4px] min-h-[300px] md:min-h-[360px] lg:min-h-[420px]" style={{ backgroundColor: '#003341' }}>
              {/* Background image */}
              {(member.image?.value?.src || isPageEditing) && member.image && (
                <ContentSdkImage
                  field={{
                    ...member.image,
                    value: {
                      ...member.image?.value,
                      style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 500ms' },
                    },
                  }}
                />
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.45) 0%, rgba(128,128,128,0.19) 100%)' }} />
              <div className="relative z-10 flex flex-col justify-end h-full p-[20px] md:p-[24px] lg:p-[32px] min-h-[300px] md:min-h-[360px] lg:min-h-[420px]">
                {(member.name?.value || isPageEditing) && (
                  <Text field={member.name} tag="h3" className="text-[20px] md:text-[24px] lg:text-[28px] font-[700] leading-[1.2] text-white mb-[4px]" />
                )}
                {(member.role?.value || isPageEditing) && (
                  <Text field={member.role} tag="p" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white/80" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<BoardMembersProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <BoardMembersDefault {...props} isPageEditing={isEditing} />;
};
