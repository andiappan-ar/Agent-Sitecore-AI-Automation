'use client';

/**
 * StockTicker — Horizontal stock/financial ticker bar
 * Sitecore fields: TickerName, TickerDate, TickerLastPrice, TickerChange, TickerChangePercent, TickerOpenPrice, TickerPreviousClose, TickerHigh, TickerLow, TickerVolume, TickerMarketCap
 * Template: Stats ({9fd657b8b7f2486ab6494f45321fe128})
 * Rendering: Stats ({c3464d89d48e4732b6a522ccd7e7c79a})
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface StockTickerParams {
  [key: string]: string;
}

export interface StockTickerFields {
  TickerName?: TextField;
  TickerDate?: TextField;
  TickerLastPrice?: TextField;
  TickerChange?: TextField;
  TickerChangePercent?: TextField;
  TickerOpenPrice?: TextField;
  TickerPreviousClose?: TextField;
  TickerHigh?: TextField;
  TickerLow?: TextField;
  TickerVolume?: TextField;
  TickerMarketCap?: TextField;
}

export interface StockTickerProps extends ComponentProps {
  params: StockTickerParams;
  fields: StockTickerFields;
  isPageEditing?: boolean;
}

// ─── Default Variant ────────────────────────────────────────────────────────────

const StockTickerDefault = (
  props: StockTickerProps & { isPageEditing?: boolean }
): JSX.Element => {
  const { fields, isPageEditing, params } = props;
  const id = params?.RenderingIdentifier;

  if (!fields) {
    return (
      <section className="component stock-ticker" id={id}>
        <div className="component-content">
          <span className="is-empty-hint">StockTicker</span>
        </div>
      </section>
    );
  }

  return (
    <section data-component="StockTicker" id={id ? id : undefined} className="stock-ticker-section w-full bg-white border-b border-[#dbdcdb] font-['ADNOC_Sans',sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto px-[16px] md:px-[24px] lg:px-[8px]">
        <div className="flex flex-col md:flex-row md:items-center gap-[12px] md:gap-[0px] py-[12px] md:py-[8px] overflow-x-auto">
          <div className="flex flex-wrap items-center gap-[8px] md:gap-[16px] text-[14px] lg:text-[16px] font-[400] leading-[24px] text-[#505557] whitespace-nowrap">
            {(fields.TickerName?.value || isPageEditing) && (
              <Text field={fields.TickerName} tag="span" className="text-[#003341] font-[700]" />
            )}
            {(fields.TickerDate?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Date:</span>
                <Text field={fields.TickerDate} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerLastPrice?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Last Price :</span>
                <Text field={fields.TickerLastPrice} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerChange?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Change:</span>
                <Text field={fields.TickerChange} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerChangePercent?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">/</span>
                <Text field={fields.TickerChangePercent} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerOpenPrice?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Open Price:</span>
                <Text field={fields.TickerOpenPrice} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerPreviousClose?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Previous close:</span>
                <Text field={fields.TickerPreviousClose} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerHigh?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">High:</span>
                <Text field={fields.TickerHigh} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerLow?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Low:</span>
                <Text field={fields.TickerLow} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerVolume?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">Volume:</span>
                <Text field={fields.TickerVolume} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
            {(fields.TickerMarketCap?.value || isPageEditing) && (
              <>
                <span className="text-[#505557]">MarketCap:</span>
                <Text field={fields.TickerMarketCap} tag="span" className="font-[700] text-[#003341]" />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Exported Variants ──────────────────────────────────────────────────────────

export const Default: React.FC<StockTickerProps> = (props) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <StockTickerDefault {...props} isPageEditing={isEditing} />;
};
