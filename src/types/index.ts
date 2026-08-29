export type SentimentType = 'Positive' | 'Neutral' | 'Negative' | 'Unknown';

export interface ColumnMapping {
  review_id: string | null;
  review_text: string | null;
  rating: string | null;
  review_date: string | null;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  sentiment: string | null;
  [key: string]: string | null;
}

export interface ReviewRecord {
  review_id: string;
  review_text: string;
  rating?: number | null;
  review_date?: string | null;
  product_name?: string;
  brand?: string;
  category?: string;
  sentiment: SentimentType;
  sentiment_confidence?: number | null;
  sentiment_provider?: string;
  [key: string]: any;
}

export interface MetricSummary {
  total_reviews: number;
  average_rating: number | null;
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  total_products: number;
  total_brands: number;
  total_categories: number;
}

export interface SentimentDistribution {
  counts: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  percentages: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
}

export interface RatingDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}

export interface DimensionBreakdownItem {
  name: string;
  count: number;
  avg_rating: number | null;
  positive: number;
  neutral: number;
  negative: number;
}

export interface DateTrendItem {
  date: string;
  count: number;
  avg_rating: number | null;
  positive: number;
  negative: number;
}

export interface ThemeInsight {
  theme: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface AnalyticsResponse {
  dataset_id: string;
  filename: string;
  columns: string[];
  metrics: MetricSummary;
  sentiment_distribution: SentimentDistribution;
  rating_distribution: RatingDistributionItem[];
  category_distribution: DimensionBreakdownItem[];
  product_distribution: DimensionBreakdownItem[];
  brand_distribution: DimensionBreakdownItem[];
  date_trend: DateTrendItem[];
  themes: ThemeInsight[];
  page: number;
  page_size: number;
  total_records: number;
  rows: ReviewRecord[];
  has_enriched_data: boolean;
  sentiment_provider: string | null;
  insight: string | null;
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  file_size: number;
  columns: string[];
  record_count: number;
  suggested_mapping: ColumnMapping;
  required_field: string;
  field_labels: Record<string, string>;
  supported_fields: string[];
  preview: Record<string, any>[];
}

export interface ProcessResponse {
  dataset_id: string;
  filename: string;
  mapping: ColumnMapping;
  columns: string[];
  summary: {
    record_count: number;
    metrics: MetricSummary;
  };
  preview: Record<string, any>[];
}

export interface SentimentResponse {
  dataset_id: string;
  columns: string[];
  sentiment: SentimentDistribution;
  preview: ReviewRecord[];
  provider: string;
  model: {
    model_name: string;
    device: string;
    batch_size: number;
    neutral_threshold: number;
  };
  total_analyzed: number;
}

export interface InsightResponse {
  dataset_id: string;
  insight: string;
  cached?: boolean;
  warning?: string;
}

export type ProcessingStep = 
  | 'idle'
  | 'uploading'
  | 'processing_dataset'
  | 'running_distilbert'
  | 'extracting_themes'
  | 'generating_insights'
  | 'completed'
  | 'error';
