// Below are built-in components that are available in the app, it's recommended to keep them as is

import { BYOCServerWrapper, NextjsContentSdkComponent, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in components
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
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
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['VideoPopup', { ...VideoPopup, componentType: 'client' }],
  ['TwoColumnText', { ...TwoColumnText, componentType: 'client' }],
  ['TwoColumnSection', { ...TwoColumnSection, componentType: 'client' }],
  ['TwoColumnDark', { ...TwoColumnDark, componentType: 'client' }],
  ['StorySection', { ...StorySection, componentType: 'client' }],
  ['StockTicker', { ...StockTicker, componentType: 'client' }],
  ['SimpleContent', { ...SimpleContent, componentType: 'client' }],
  ['Sidebar', { ...Sidebar, componentType: 'client' }],
  ['ScrollIndicator', { ...ScrollIndicator, componentType: 'client' }],
  ['PropsColumns', { ...PropsColumns, componentType: 'client' }],
  ['PartnerCarousel', { ...PartnerCarousel, componentType: 'client' }],
  ['NewsCards', { ...NewsCards, componentType: 'client' }],
  ['InnovationSlider', { ...InnovationSlider, componentType: 'client' }],
  ['ImageDescriptionReverse', { ...ImageDescriptionReverse, componentType: 'client' }],
  ['ImageDescription', { ...ImageDescription, componentType: 'client' }],
  ['ImageDescBelow', { ...ImageDescBelow, componentType: 'client' }],
  ['HeroInner', { ...HeroInner, componentType: 'client' }],
  ['HeroHomepage', { ...HeroHomepage, componentType: 'client' }],
  ['Hero', { ...Hero, componentType: 'client' }],
  ['Header', { ...Header, componentType: 'client' }],
  ['FullMedia', { ...FullMedia, componentType: 'client' }],
  ['Footer', { ...Footer, componentType: 'client' }],
  ['FinancialCalendar', { ...FinancialCalendar, componentType: 'client' }],
  ['CTAImageCard', { ...CTAImageCard, componentType: 'client' }],
  ['ContentBlock', { ...ContentBlock, componentType: 'client' }],
  ['ColumnsGrid', { ...ColumnsGrid, componentType: 'client' }],
  ['Breadcrumb', { ...Breadcrumb, componentType: 'client' }],
  ['BoardMembers', { ...BoardMembers, componentType: 'client' }],
  ['ArticlesListing', { ...ArticlesListing, componentType: 'client' }],
  ['AnnouncementCarousel', { ...AnnouncementCarousel, componentType: 'client' }],
  ['AccordionFAQ', { ...AccordionFAQ, componentType: 'client' }],
  ['Accordion', { ...Accordion, componentType: 'client' }],
]);

export default componentMap;
