// Client-safe component map for App Router

import { BYOCClientWrapper, NextjsContentSdkComponent, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

import * as VideoPopup from 'src/components/adnocgas/VideoPopup';
import * as TwoColumnText from 'src/components/adnocgas/TwoColumnText';
import * as TwoColumnSection from 'src/components/adnocgas/TwoColumnSection';
import * as TwoColumnDark from 'src/components/adnocgas/TwoColumnDark';
import * as StorySection from 'src/components/adnocgas/StorySection';
import * as StockTicker from 'src/components/adnocgas/StockTicker';
import * as SimpleContent from 'src/components/adnocgas/SimpleContent';
import * as Sidebar from 'src/components/adnocgas/Sidebar';
import * as ScrollIndicator from 'src/components/adnocgas/ScrollIndicator';
import * as PropsColumns from 'src/components/adnocgas/PropsColumns';
import * as PartnerCarousel from 'src/components/adnocgas/PartnerCarousel';
import * as NewsCards from 'src/components/adnocgas/NewsCards';
import * as InnovationSlider from 'src/components/adnocgas/InnovationSlider';
import * as ImageDescriptionReverse from 'src/components/adnocgas/ImageDescriptionReverse';
import * as ImageDescription from 'src/components/adnocgas/ImageDescription';
import * as ImageDescBelow from 'src/components/adnocgas/ImageDescBelow';
import * as HeroInner from 'src/components/adnocgas/HeroInner';
import * as HeroHomepage from 'src/components/adnocgas/HeroHomepage';
import * as Hero from 'src/components/adnocgas/Hero';
import * as Header from 'src/components/adnocgas/Header';
import * as FullMedia from 'src/components/adnocgas/FullMedia';
import * as Footer from 'src/components/adnocgas/Footer';
import * as FinancialCalendar from 'src/components/adnocgas/FinancialCalendar';
import * as CTAImageCard from 'src/components/adnocgas/CTAImageCard';
import * as ContentBlock from 'src/components/adnocgas/ContentBlock';
import * as ColumnsGrid from 'src/components/adnocgas/ColumnsGrid';
import * as Breadcrumb from 'src/components/adnocgas/Breadcrumb';
import * as BoardMembers from 'src/components/adnocgas/BoardMembers';
import * as ArticlesListing from 'src/components/adnocgas/ArticlesListing';
import * as AnnouncementCarousel from 'src/components/adnocgas/AnnouncementCarousel';
import * as AccordionFAQ from 'src/components/adnocgas/AccordionFAQ';
import * as Accordion from 'src/components/adnocgas/Accordion';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['VideoPopup', { ...VideoPopup }],
  ['TwoColumnText', { ...TwoColumnText }],
  ['TwoColumnSection', { ...TwoColumnSection }],
  ['TwoColumnDark', { ...TwoColumnDark }],
  ['StorySection', { ...StorySection }],
  ['StockTicker', { ...StockTicker }],
  ['SimpleContent', { ...SimpleContent }],
  ['Sidebar', { ...Sidebar }],
  ['ScrollIndicator', { ...ScrollIndicator }],
  ['PropsColumns', { ...PropsColumns }],
  ['PartnerCarousel', { ...PartnerCarousel }],
  ['NewsCards', { ...NewsCards }],
  ['InnovationSlider', { ...InnovationSlider }],
  ['ImageDescriptionReverse', { ...ImageDescriptionReverse }],
  ['ImageDescription', { ...ImageDescription }],
  ['ImageDescBelow', { ...ImageDescBelow }],
  ['HeroInner', { ...HeroInner }],
  ['HeroHomepage', { ...HeroHomepage }],
  ['Hero', { ...Hero }],
  ['Header', { ...Header }],
  ['FullMedia', { ...FullMedia }],
  ['Footer', { ...Footer }],
  ['FinancialCalendar', { ...FinancialCalendar }],
  ['CTAImageCard', { ...CTAImageCard }],
  ['ContentBlock', { ...ContentBlock }],
  ['ColumnsGrid', { ...ColumnsGrid }],
  ['Breadcrumb', { ...Breadcrumb }],
  ['BoardMembers', { ...BoardMembers }],
  ['ArticlesListing', { ...ArticlesListing }],
  ['AnnouncementCarousel', { ...AnnouncementCarousel }],
  ['AccordionFAQ', { ...AccordionFAQ }],
  ['Accordion', { ...Accordion }],
]);

export default componentMap;
