'use client';

/**
 * Sidebar — Browser scroll artifact, not a real visible component
 * Template: Sidebar ({9253b0d74115420a8350065d71df9af6})
 * Rendering: Sidebar ({e478fe4596be4a12a8d5210b121010ec})
 * Returns null.
 */

import type React from 'react';
import { type JSX } from 'react';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface SidebarParams {
  [key: string]: string;
}

export interface SidebarProps extends ComponentProps {
  params: SidebarParams;
}

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<SidebarProps> = (): JSX.Element | null => {
  return null;
};
