import type { AppSettings, BaseUnit, BusinessType, RetailSubType, StorageLocation } from '@/types';

export interface VerticalProfile {
  businessType: BusinessType;
  label: string;
  locations: Array<{ value: StorageLocation; label: string }>;
  defaultLocation: StorageLocation;
  defaultUnit: BaseUnit;
  displayUnit: string;
  features: {
    recipes: boolean;
    fillLevel: boolean;
    batchItems: boolean;
    variants: boolean;
    sku: boolean;
  };
  catalogSearchPlaceholder: string;
  seedLabel: string;
  mockPhrases: string[];
}

const HOSPITALITY_LOCATIONS: VerticalProfile['locations'] = [
  { value: 'bar', label: 'Bar' },
  { value: 'cellar', label: 'Cellar' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'custom', label: 'Custom' },
];

const RETAIL_LOCATIONS: VerticalProfile['locations'] = [
  { value: 'floor', label: 'Sales floor' },
  { value: 'stockroom', label: 'Stockroom' },
  { value: 'fitting', label: 'Fitting room' },
  { value: 'backroom', label: 'Backroom' },
  { value: 'custom', label: 'Custom' },
];

export const HOSPITALITY_PROFILE: VerticalProfile = {
  businessType: 'hospitality',
  label: 'Hospitality',
  locations: HOSPITALITY_LOCATIONS,
  defaultLocation: 'bar',
  defaultUnit: 'ml',
  displayUnit: 'bottle',
  features: {
    recipes: true,
    fillLevel: true,
    batchItems: true,
    variants: false,
    sku: false,
  },
  catalogSearchPlaceholder: 'Search spirits…',
  seedLabel: 'Reseed top 100 spirits',
  mockPhrases: ['Belvedere 2', 'Tanqueray 1', 'Trailblazer 0.6', 'Belvedere 2 and Tanqueray 1'],
};

export const RETAIL_PROFILE: VerticalProfile = {
  businessType: 'retail',
  label: 'Retail',
  locations: RETAIL_LOCATIONS,
  defaultLocation: 'floor',
  defaultUnit: 'each',
  displayUnit: 'unit',
  features: {
    recipes: false,
    fillLevel: false,
    batchItems: false,
    variants: true,
    sku: true,
  },
  catalogSearchPlaceholder: 'Search by name, SKU, brand…',
  seedLabel: 'Reseed sample retail catalog',
  mockPhrases: [
    'Nike Air Max 90 black 10 3',
    'Levi 501 blue 32 5',
    'Champion hoodie grey medium 2',
    'Converse Chuck 70 black 9 1',
  ],
};

export function getVerticalProfile(settings: Pick<AppSettings, 'businessType'>): VerticalProfile {
  return settings.businessType === 'retail' ? RETAIL_PROFILE : HOSPITALITY_PROFILE;
}

export function getRetailSubTypeLabel(subType: RetailSubType): string {
  switch (subType) {
    case 'apparel':
      return 'Apparel';
    case 'footwear':
      return 'Footwear';
    case 'general':
      return 'General merchandise';
  }
}

export function formatRetailItemLabel(item: {
  name: string;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
}): string {
  const parts = [item.name];
  if (item.color) parts.push(item.color);
  if (item.size) parts.push(`size ${item.size}`);
  if (item.sku) parts.push(`SKU ${item.sku}`);
  return parts.join(' · ');
}
