import type { MotionStyleId } from './types';

export type MotionRecommendationFormat = 'review' | 'news' | 'guide' | 'compare' | 'top-n';

const FORMAT_RECOMMENDATIONS: Record<MotionRecommendationFormat, MotionStyleId> = {
  review: 'luxury-product',
  news: 'visual-journalism',
  guide: 'minimal-data',
  compare: 'white-catalog',
  'top-n': 'minimal-data'
};

export interface MotionStyleRecommendationInput {
  format: MotionRecommendationFormat;
  context?: 'generic' | 'fashion' | 'product' | 'data';
}

/**
 * Deterministic recommendation only. It never overrides an explicit user choice.
 */
export function recommendMotionStyle(input: MotionStyleRecommendationInput): MotionStyleId {
  if (input.context === 'fashion') return 'editorial-fashion';
  if (input.context === 'product' && input.format !== 'news') return 'luxury-product';
  if (input.context === 'data' && input.format !== 'news') return 'minimal-data';
  return FORMAT_RECOMMENDATIONS[input.format];
}
