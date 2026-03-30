'use client';

/**
 * FullMedia — Full-width media section with video or image and optional caption
 * Sitecore fields: Image, VideoUrl, Caption
 * Template: VideoSection ({3260c7939a854d27a0c9e90edf1f656d})
 * Rendering: VideoSection ({4509921b6e874efdabe2145170d9a524})
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

interface FullMediaParams {
  [key: string]: string;
}

export interface FullMediaFields {
  Image?: ImageField;
  VideoUrl?: TextField;
  Caption?: TextField;
}

export interface FullMediaProps extends ComponentProps {
  params: FullMediaParams;
  fields: FullMediaFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const FullMediaDefault = (
  props: FullMediaProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component full-media" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">FullMedia</span>
        </div>
      </section>
    );
  }

  const videoUrl = String(fields.VideoUrl?.value || '');

  return (
    <section data-component="FullMedia" id={id ? id : undefined} className="full-media-section w-full font-['ADNOC_Sans',sans-serif]">
      <div className="w-full relative">
        {videoUrl && !isPageEditing ? (
          <video
            className="w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            src={videoUrl}
          />
        ) : (fields.Image?.value?.src || isPageEditing) ? (
          <ContentSdkImage
            field={{
              ...fields.Image,
              value: {
                ...fields.Image?.value,
                style: { width: '100%', height: 'auto', objectFit: 'cover' },
              },
            }}
          />
        ) : (
          <div className="w-full h-[300px] md:h-[400px] lg:h-[500px] bg-[#003341]" />
        )}
        {(fields.Caption?.value || isPageEditing) && (
          <div className="absolute bottom-0 left-0 right-0 p-[16px] md:p-[24px]" style={{ backgroundColor: 'rgba(0,26,112,0.7)' }}>
            <div className="max-w-[1400px] mx-auto px-[8px]">
              <Text field={fields.Caption} tag="p" className="text-[14px] md:text-[16px] font-[400] leading-[1.5] lg:leading-[24px] text-white" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<FullMediaProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <FullMediaDefault {...props} isPageEditing={isEditing} />;
};
