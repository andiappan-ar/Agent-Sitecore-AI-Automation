'use client';

/**
 * ScrollIndicator — Browser scroll artifact, not a real visible component
 * Returns null.
 */

import type React from 'react';
import { type JSX } from 'react';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface ScrollIndicatorParams {
  [key: string]: string;
}

export interface ScrollIndicatorProps extends ComponentProps {
  params: ScrollIndicatorParams;
}

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<ScrollIndicatorProps> = (): JSX.Element | null => {
  return null;
};
