import {lightColors} from '@/theme/colors';
import type {IconName} from '@/components/ui/AppIcon';

export const COMPLAINT_CATEGORIES = [
  'garbage',
  'potholes',
  'broken_streetlights',
  'water_leakage',
  'sewage_overflow',
  'illegal_dumping',
  'road_damage',
  'public_toilets',
  'snow_blockage',
  'dead_animals',
  'fallen_trees',
  'others',
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const CATEGORY_META: Record<
  ComplaintCategory,
  {label: string; icon: IconName; color: string}
> = {
  garbage: {label: 'Garbage', icon: 'trash', color: '#3D4A47'},
  potholes: {label: 'Potholes', icon: 'car', color: '#FF7A1A'},
  broken_streetlights: {label: 'Streetlights', icon: 'lightbulb', color: '#E0A800'},
  water_leakage: {label: 'Water Leakage', icon: 'droplets', color: '#6C5CE7'},
  sewage_overflow: {label: 'Sewage', icon: 'triangle-alert', color: '#2E8B57'},
  illegal_dumping: {label: 'Illegal Dumping', icon: 'alert-triangle', color: '#D64545'},
  road_damage: {label: 'Road Damage', icon: 'wrench', color: '#57534E'},
  public_toilets: {label: 'Public Toilets', icon: 'building', color: '#1B5C5D'},
  snow_blockage: {label: 'Snow Blockage', icon: 'snowflake', color: '#4A6B6C'},
  dead_animals: {label: 'Dead Animals', icon: 'paw', color: '#92400E'},
  fallen_trees: {label: 'Fallen Trees', icon: 'leaf', color: '#2E8B57'},
  others: {label: 'Others', icon: 'more', color: lightColors.primary},
};
