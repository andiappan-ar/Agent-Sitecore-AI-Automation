'use client';

/**
 * VideoPopup — Background image with play button that opens video modal
 * Sitecore fields: Heading, BackgroundImage, VideoUrl
 * Template: VideoSection ({3260c7939a854d27a0c9e90edf1f656d})
 * Rendering: VideoSection ({4509921b6e874efdabe2145170d9a524})
 */

import type React from 'react';
import { type JSX } from 'react';
import { useState } from 'react';
import {
  NextImage as ContentSdkImage,
  ImageField,
  Text,
  TextField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface VideoPopupParams {
  [key: string]: string;
}

export interface VideoPopupFields {
  Heading?: TextField;
  BackgroundImage?: ImageField;
  VideoUrl?: TextField;
}

export interface VideoPopupProps extends ComponentProps {
  params: VideoPopupParams;
  fields: VideoPopupFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const VideoPopupDefault = (
  props: VideoPopupProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;
  const [isPlaying, setIsPlaying] = useState(false);

  if (!fields) {
    return (
      <section className="component video-popup" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">VideoPopup</span>
        </div>
      </section>
    );
  }

  const videoUrl = String(fields.VideoUrl?.value || '');

  return (
    <section
      data-component="VideoPopup"
      id={id ? id : undefined}
      className="video-popup-section w-full relative min-h-[300px] md:min-h-[400px] lg:min-h-[500px] overflow-hidden font-['ADNOC_Sans',sans-serif]"
      style={{ backgroundColor: '#003341' }}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.21), rgba(0,0,0,0.06))' }} />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px] flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
        {(fields.Heading?.value || isPageEditing) && (
          <Text field={fields.Heading} tag="h3" className="text-[24px] md:text-[34px] lg:text-[40px] font-[700] leading-[1.2] lg:leading-[48px] text-white text-center mb-[24px]" />
        )}
        <button
          onClick={() => setIsPlaying(true)}
          className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-full bg-white/20 border-2 border-white flex items-center justify-center hover:bg-white/40 transition-all duration-300"
          aria-label="Play video"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
        </button>
      </div>

      {/* Video modal */}
      {isPlaying && videoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-[16px]" onClick={() => setIsPlaying(false)}>
          <div className="relative w-full max-w-[900px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsPlaying(false)}
              className="absolute -top-[40px] right-0 text-white text-[24px] hover:text-[#00bfb2] transition-colors"
              aria-label="Close"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <video
              className="w-full h-auto rounded-[4px]"
              controls
              autoPlay
              src={videoUrl}
            />
          </div>
        </div>
      )}
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<VideoPopupProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <VideoPopupDefault {...props} isPageEditing={isEditing} />;
};
