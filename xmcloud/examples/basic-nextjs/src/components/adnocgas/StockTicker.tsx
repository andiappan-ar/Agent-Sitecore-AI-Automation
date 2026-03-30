'use client';

/**
 * StockTicker -- Horizontal scrolling stock/financial ticker bar
 *
 * Template: Stats ({9fd657b8-b7f2-486a-b649-4f45321fe128})
 *   - Heading  (Single-Line Text)
 *   - Description  (Rich Text)
 * Rendering: Stats ({c3464d89-d48e-4732-b6a5-22ccd7e7c79a})
 * Datasource: ticker-widget
 *
 * NOTE: Only Heading and Description are Sitecore-managed fields.
 * The individual ticker data points (prices, change, volume, etc.) are
 * live financial data -- kept as static/hardcoded values here since there
 * are no corresponding Sitecore template fields for them.
 */

import type React from 'react';
import { type JSX } from 'react';
import {
  Text,
  TextField,
  RichText,
  RichTextField,
  useSitecore,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface StockTickerParams {
  [key: string]: string;
}

export interface StockTickerFields {
  Heading?: TextField;
  Description?: RichTextField;
}

export interface StockTickerProps extends ComponentProps {
  params: StockTickerParams;
  fields: StockTickerFields;
  isPageEditing?: boolean;
}

// ─── Ticker data (live financial data, not from Sitecore) ───────────────────────

const adnocGas = {
  title: 'ADNOC Gas',
  date: '2026-03-30',
  lastPrice: '3.25',
  changeVal: '0.01',
  changePct: '0.31%',
  openPrice: '3.24',
  high: '3.26',
  low: '3.19',
  volume: '10097807',
  marketCap: '249442121539',
};

const adxIndex = {
  title: 'ADX General Index',
  date: '2026-03-30',
  lastPrice: '9525.78',
  changeVal: '-71.05',
  changePct: '-0.74%',
  open: '9596.83',
  high: '9618.85',
  low: '9524.80',
};

// ─── Inner ──────────────────────────────────────────────────────────────────────

const Inner = (props: StockTickerProps): JSX.Element => {
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

  // Determine color for change values
  const adnocChangeColor = (adnocGas.changeVal || '').startsWith('-')
    ? 'text-[#d50032]'
    : 'text-[#009639]';
  const adxChangeColor = (adxIndex.changeVal || '').startsWith('-')
    ? 'text-[#d50032]'
    : 'text-[#009639]';

  return (
    <section
      data-component="StockTicker"
      id={id ? id : undefined}
      className="w-full bg-[#f6f6f6] text-[#505557] text-[16px] font-[400] leading-[24px] font-['ADNOC_Sans',sans-serif]"
    >
      {/* Sitecore-editable heading (hidden visually but available in editor) */}
      {isPageEditing && fields.Heading?.value && (
        <div className="px-[12px] py-[4px] bg-[#e0e0e0]">
          <Text field={fields.Heading} tag="span" className="font-[700] text-[#003341]" />
        </div>
      )}

      <div className="w-full max-w-[1205px] px-[7.5px] mx-auto overflow-hidden">
        <div className="w-full text-[rgba(16,155,122,0.9)] whitespace-nowrap overflow-x-auto scrollbar-hide">
          <div className="inline-flex whitespace-nowrap animate-ticker">
            {/* ADNOC Gas ticker set */}
            <div className="inline-flex whitespace-nowrap">
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] ml-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.title}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Date:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.date}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Last Price :</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.lastPrice}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Change:</span>
                <span className={`inline font-[700] whitespace-nowrap ${adnocChangeColor}`}>
                  {adnocGas.changeVal}
                </span>
                <span className={`inline whitespace-nowrap ${adnocChangeColor}`}>/</span>
                <span className={`inline mr-[12px] font-[700] whitespace-nowrap ${adnocChangeColor}`}>
                  {adnocGas.changePct}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Open Price:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.openPrice}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Previous close:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap"></span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">High:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.high}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Low:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.low}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Volume:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.volume}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">MarketCap:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adnocGas.marketCap}
                </span>
              </div>
            </div>

            {/* ADX General Index ticker set */}
            <div className="inline-flex whitespace-nowrap">
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] ml-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.title}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Date:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.date}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Last Price :</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.lastPrice}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Change:</span>
                <span className={`inline font-[700] whitespace-nowrap ${adxChangeColor}`}>
                  {adxIndex.changeVal}
                </span>
                <span className={`inline whitespace-nowrap ${adxChangeColor}`}>/</span>
                <span className={`inline mr-[12px] font-[700] whitespace-nowrap ${adxChangeColor}`}>
                  {adxIndex.changePct}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Open:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.open}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Previous close:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap"></span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">High:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.high}
                </span>
              </div>
              <div className="inline-flex items-center py-[8px] whitespace-nowrap">
                <span className="inline mr-[6px] whitespace-nowrap">Low:</span>
                <span className="inline mr-[12px] font-[700] whitespace-nowrap">
                  {adxIndex.low}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

// ─── Exported Variant ───────────────────────────────────────────────────────────

export const Default = (props: StockTickerProps): JSX.Element => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <Inner {...props} isPageEditing={isEditing} />;
};
