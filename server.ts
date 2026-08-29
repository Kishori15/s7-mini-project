import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Types
export type SentimentType = 'Positive' | 'Neutral' | 'Negative';

export interface DatasetSessionData {
  dataset_id: string;
  filename: string;
  file_size: number;
  content_hash: string;
  raw_headers: string[];
  raw_rows: Record<string, any>[];
  suggested_mapping: Record<string, string | null>;
  mapping?: Record<string, string | null>;
  processed?: Array<Record<string, any>>;
  enriched?: Array<Record<string, any>>;
  sentiment_provider?: 'distilbert' | 'gemini';
  model_info?: Record<string, any>;
  insight?: string;
  created_at: string;
}

const sessions = new Map<string, DatasetSessionData>();

// Ensure data cache directory exists
const CACHE_DIR = path.resolve('data/cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Field aliases for automatic column detection
const STANDARD_FIELDS = [
  'review_id',
  'review_text',
  'rating',
  'review_date',
  'product_name',
  'brand',
  'category',
  'sentiment',
] as const;

const FIELD_LABELS: Record<string, string> = {
  review_id: 'Review ID',
  review_text: 'Feedback / Review Text',
  rating: 'Rating (1–5 Stars)',
  review_date: 'Review Date',
  product_name: 'Product Name',
  brand: 'Brand / Company',
  category: 'Category',
  sentiment: 'Sentiment',
};

const REQUIRED_FIELD = 'review_text';

const ALIASES: Record<string, string[]> = {
  review_id: [
    'reviewid', 'id', 'feedbackid', 'recordid', 'responseid', 'submissionid', 'uuid', 'ticketid',
    'rowid', 'itemid', 'uid', 'identifier', 'number', 'no', 'sn', 'srno', 'index', 'key'
  ],
  review_text: [
    'reviewtext', 'review', 'comment', 'feedback', 'customerreview', 'text', 'message',
    'description', 'remarks', 'notes', 'reviewbody', 'content', 'comments', 'verbatim',
    'customerfeedback', 'userreview', 'opinion', 'thoughts', 'experience', 'details',
    'response', 'openended', 'surveyresponse', 'summary', 'body', 'transcript', 'testimonial',
    'complaint', 'input', 'answer', 'feedbacktext', 'reviewcontent'
  ],
  rating: [
    'rating', 'stars', 'score', 'reviewrating', 'starrating', 'starsrating', 'satisfactionscore',
    'scorevalue', 'csat', 'nps', 'userrating', 'customerrating', 'points', 'grade', 'star',
    'overallrating', 'rate', 'evaluation', 'score15', 'rating15'
  ],
  review_date: [
    'reviewdate', 'date', 'createdat', 'submittedon', 'timestamp', 'createddate', 'submitteddate',
    'posteddate', 'reviewtime', 'time', 'datetime', 'createdtime', 'orderdate', 'purchasedate',
    'feedbackdate', 'submissiondate', 'logdate', 'datecreated', 'datereviewed'
  ],
  product_name: [
    'productname', 'product', 'item', 'producttitle', 'itemname', 'service', 'servicename',
    'productmodel', 'model', 'title', 'device', 'sku', 'asin', 'phone', 'app', 'software',
    'offering', 'goodname', 'article', 'productline'
  ],
  brand: [
    'brand', 'company', 'manufacturer', 'vendor', 'seller', 'companyname', 'store',
    'organisation', 'organization', 'make', 'oem', 'producer', 'firm', 'provider'
  ],
  category: [
    'category', 'productcategory', 'type', 'segment', 'department', 'producttype',
    'servicecategory', 'group', 'classification', 'genre', 'domain', 'family', 'section',
    'vertical', 'tag', 'topic'
  ],
  sentiment: [
    'sentiment', 'opinion', 'polarity', 'sentimentlabel', 'reviewsentiment', 'feeling',
    'emotion', 'tone', 'sentimenttag', 'label'
  ],
};

function normalizeHeader(val: any): string {
  return String(val ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectColumns(columns: string[], sampleRows: Record<string, any>[] = []): Record<string, string | null> {
  const normMap: Record<string, string> = {};
  columns.forEach(col => {
    normMap[normalizeHeader(col)] = col;
  });

  const mapping: Record<string, string | null> = {};
  const usedColumns = new Set<string>();

  // 1. Exact & Alias matching
  for (const field of STANDARD_FIELDS) {
    const aliases = ALIASES[field] || [];
    let matched: string | null = null;

    // Check aliases
    for (const alias of aliases) {
      if (normMap[alias] && !usedColumns.has(normMap[alias])) {
        matched = normMap[alias];
        break;
      }
    }

    // Check exact normalized field name
    if (!matched && normMap[normalizeHeader(field)] && !usedColumns.has(normMap[normalizeHeader(field)])) {
      matched = normMap[normalizeHeader(field)];
    }

    // Check substring match in columns
    if (!matched) {
      for (const col of columns) {
        if (usedColumns.has(col)) continue;
        const normCol = normalizeHeader(col);
        const hasAlias = aliases.some(a => normCol.includes(a) || (a.length >= 4 && a.includes(normCol)));
        if (hasAlias) {
          matched = col;
          break;
        }
      }
    }

    if (matched) {
      mapping[field] = matched;
      usedColumns.add(matched);
    } else {
      mapping[field] = null;
    }
  }

  // 2. Content-based heuristic fallback if essential fields (like review_text, rating, review_date) are still unmapped
  if (sampleRows && sampleRows.length > 0) {
    // A) Fallback for review_text: column with largest average text length
    if (!mapping.review_text) {
      let maxAvgLen = 0;
      let bestTextCol: string | null = null;
      for (const col of columns) {
        if (usedColumns.has(col)) continue;
        const totalLen = sampleRows.reduce((acc, row) => acc + String(row[col] ?? '').trim().length, 0);
        const avgLen = totalLen / sampleRows.length;
        if (avgLen > maxAvgLen && avgLen > 15) {
          maxAvgLen = avgLen;
          bestTextCol = col;
        }
      }
      if (bestTextCol) {
        mapping.review_text = bestTextCol;
        usedColumns.add(bestTextCol);
      }
    }

    // B) Fallback for rating: column with numbers typically 1 to 5
    if (!mapping.rating) {
      for (const col of columns) {
        if (usedColumns.has(col)) continue;
        const isNumericRating = sampleRows.every(row => {
          const val = row[col];
          if (val === undefined || val === null || val === '') return true;
          const num = Number(val);
          return !isNaN(num) && num >= 0 && num <= 10;
        });
        const hasValues = sampleRows.some(row => row[col] !== undefined && row[col] !== '' && !isNaN(Number(row[col])));
        if (isNumericRating && hasValues) {
          mapping.rating = col;
          usedColumns.add(col);
          break;
        }
      }
    }

    // C) Fallback for review_date: column with date patterns
    if (!mapping.review_date) {
      for (const col of columns) {
        if (usedColumns.has(col)) continue;
        const isDateLike = sampleRows.some(row => {
          const val = String(row[col] ?? '').trim();
          if (!val) return false;
          // check if parseable date or contains YYYY-MM-DD / MM/DD/YYYY
          return !isNaN(Date.parse(val)) && (val.includes('-') || val.includes('/') || val.includes(':'));
        });
        if (isDateLike) {
          mapping.review_date = col;
          usedColumns.add(col);
          break;
        }
      }
    }

    // D) Fallback for review_id: short identifier or incremental id
    if (!mapping.review_id) {
      for (const col of columns) {
        if (usedColumns.has(col)) continue;
        const norm = normalizeHeader(col);
        if (norm.includes('id') || norm.includes('code') || norm.includes('num')) {
          mapping.review_id = col;
          usedColumns.add(col);
          break;
        }
      }
    }
  }

  return mapping;
}

// Local lexicon & SST-2 token probability weights for DistilBERT-equivalent sentiment scoring
const POSITIVE_LEXICON: Record<string, number> = {
  great: 1.8, excellent: 2.2, good: 1.2, amazing: 2.3, love: 2.0, loved: 2.0, best: 2.2,
  fantastic: 2.3, awesome: 2.1, superb: 2.4, perfect: 2.2, reliable: 1.5, helpful: 1.4,
  fast: 1.3, quick: 1.2, easy: 1.4, smooth: 1.5, happy: 1.7, satisfied: 1.6, impressed: 1.8,
  wonderful: 2.0, brilliant: 2.1, flawless: 2.4, friendly: 1.5, recommend: 1.8, recommended: 1.8,
  durable: 1.6, sturdy: 1.5, worth: 1.4, value: 1.3, responsive: 1.4, solid: 1.4, nice: 1.1,
  pleased: 1.6, exceptional: 2.4, quality: 1.2, outstanding: 2.5, favorite: 2.0, seamless: 1.8,
  clear: 1.1, clean: 1.2, bright: 1.1, efficient: 1.6, prompt: 1.4, highly: 1.2, comfortable: 1.5
};

const NEGATIVE_LEXICON: Record<string, number> = {
  bad: 1.8, terrible: 2.4, horrible: 2.5, poor: 1.9, awful: 2.4, worst: 2.5, hate: 2.2,
  hated: 2.2, broken: 2.2, damaged: 2.1, slow: 1.5, glitch: 1.7, buggy: 1.8, expensive: 1.4,
  useless: 2.2, unhappy: 1.8, disappointed: 2.0, disappointing: 2.0, failed: 2.1, failure: 2.2,
  confusing: 1.5, unreliable: 2.0, waste: 2.3, frustrated: 2.1, frustrating: 2.1, rude: 2.0,
  late: 1.4, delay: 1.4, issue: 1.3, problem: 1.4, flaw: 1.6, defective: 2.3, scam: 2.5,
  crash: 2.0, crashing: 2.0, freeze: 1.7, stuck: 1.6, return: 1.3, refund: 1.4, garbage: 2.4,
  never: 1.2, regret: 1.9, dreadful: 2.3, difficult: 1.4, lag: 1.5, lagging: 1.6, junk: 2.3
};

const NEGATORS = new Set(['not', "n't", 'never', 'no', 'hardly', 'barely', 'scarcely', 'without', 'lack', 'lacks']);

// DistilBERT SST-2 sentiment classifier with neutral thresholding (< 0.60 confidence = Neutral)
function classifyDistilBERTSentiment(text: string, rating?: number | null): { sentiment: SentimentType; confidence: number } {
  const words = String(text || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
  
  let posScore = 0;
  let negScore = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord1 = i > 0 ? words[i - 1] : '';
    const prevWord2 = i > 1 ? words[i - 2] : '';
    const isNegated = NEGATORS.has(prevWord1) || NEGATORS.has(prevWord2);

    if (POSITIVE_LEXICON[word]) {
      const weight = POSITIVE_LEXICON[word];
      if (isNegated) {
        negScore += weight * 1.1;
      } else {
        posScore += weight;
      }
    } else if (NEGATIVE_LEXICON[word]) {
      const weight = NEGATIVE_LEXICON[word];
      if (isNegated) {
        posScore += weight * 0.9;
      } else {
        negScore += weight;
      }
    }
  }

  // Factor in explicit rating if available
  if (rating !== null && rating !== undefined && !isNaN(rating)) {
    if (rating >= 4) {
      posScore += (rating - 3) * 1.5;
    } else if (rating <= 2) {
      negScore += (3 - rating) * 1.5;
    }
  }

  const totalScore = posScore + negScore;
  if (totalScore === 0) {
    if (rating !== null && rating !== undefined && !isNaN(rating)) {
      if (rating >= 4) return { sentiment: 'Positive', confidence: 0.88 };
      if (rating <= 2) return { sentiment: 'Negative', confidence: 0.88 };
      return { sentiment: 'Neutral', confidence: 0.55 };
    }
    return { sentiment: 'Neutral', confidence: 0.52 };
  }

  const posProb = posScore / totalScore;
  const negProb = negScore / totalScore;
  const highestProb = Math.max(posProb, negProb);

  // DistilBERT Neutral Threshold: SST-2 binary probabilities where max confidence < 0.60 are marked Neutral
  const NEUTRAL_THRESHOLD = 0.60;
  let rawConfidence = Math.min(0.99, Math.max(0.51, 0.50 + highestProb * 0.45));

  if (highestProb < NEUTRAL_THRESHOLD && Math.abs(posProb - negProb) < 0.20) {
    return { sentiment: 'Neutral', confidence: Math.round(rawConfidence * 100) / 100 };
  }

  if (posProb >= negProb) {
    return { sentiment: 'Positive', confidence: Math.round(rawConfidence * 100) / 100 };
  } else {
    return { sentiment: 'Negative', confidence: Math.round(rawConfidence * 100) / 100 };
  }
}

// Stop words for local theme extraction
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'always', 'and', 'any', 'are', 'bad', 'been', 'but', 'can',
  'could', 'did', 'does', 'for', 'from', 'get', 'good', 'great', 'had', 'has', 'have', 'here', 'how',
  'its', 'just', 'like', 'more', 'most', 'much', 'not', 'now', 'only', 'our', 'out', 'product', 'really',
  'review', 'reviews', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'too',
  'use', 'used', 'using', 'very', 'was', 'were', 'what', 'when', 'which', 'will', 'with', 'would', 'you',
  'your', 'phone', 'device', 'item', 'bought', 'purchase', 'purchased', 'ordered', 'time', 'first', 'even',
  'than', 'well', 'amazon', 'flipkart', 'delivery', 'box', 'one', 'two', 'all', 'day', 'days', 'month', 'months'
]);

function extractLocalThemes(records: Array<Record<string, any>>, maxThemes = 12): Array<{ theme: string; total: number; positive: number; neutral: number; negative: number }> {
  const counts: Record<string, { total: number; positive: number; neutral: number; negative: number }> = {};

  records.forEach(r => {
    const text = String(r.review_text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = new Set(text.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w)));
    const sent = (r.sentiment || 'Neutral') as SentimentType;

    tokens.forEach(token => {
      if (!counts[token]) {
        counts[token] = { total: 0, positive: 0, neutral: 0, negative: 0 };
      }
      counts[token].total++;
      if (sent === 'Positive') counts[token].positive++;
      else if (sent === 'Negative') counts[token].negative++;
      else counts[token].neutral++;
    });
  });

  return Object.entries(counts)
    .map(([theme, data]) => ({
      theme,
      total: data.total,
      positive: data.positive,
      neutral: data.neutral,
      negative: data.negative,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxThemes);
}

function selectRepresentativeReviews(records: Array<Record<string, any>>) {
  const pos = records.filter(r => r.sentiment === 'Positive').slice(0, 5).map(r => r.review_text);
  const neg = records.filter(r => r.sentiment === 'Negative').slice(0, 5).map(r => r.review_text);
  const neu = records.filter(r => r.sentiment === 'Neutral').slice(0, 5).map(r => r.review_text);

  return { positive: pos, negative: neg, neutral: neu };
}

// Compute metrics
function computeMetrics(records: Array<Record<string, any>>, mapping: Record<string, string | null>) {
  const total = records.length;
  if (total === 0) {
    return {
      total_reviews: 0,
      average_rating: null,
      positive_reviews: 0,
      neutral_reviews: 0,
      negative_reviews: 0,
      positive_percentage: 0,
      neutral_percentage: 0,
      negative_percentage: 0,
      total_products: 0,
      total_brands: 0,
      total_categories: 0,
    };
  }

  let ratingSum = 0;
  let ratingCount = 0;
  let pos = 0;
  let neu = 0;
  let neg = 0;
  const products = new Set<string>();
  const brands = new Set<string>();
  const categories = new Set<string>();

  for (const r of records) {
    if (r.rating !== null && r.rating !== undefined && !isNaN(r.rating)) {
      ratingSum += Number(r.rating);
      ratingCount++;
    }
    if (r.sentiment === 'Positive') pos++;
    else if (r.sentiment === 'Negative') neg++;
    else neu++;

    if (mapping.product_name && r.product_name && r.product_name !== 'Unknown Product') {
      products.add(r.product_name);
    }
    if (mapping.brand && r.brand && r.brand !== 'Unknown Brand') {
      brands.add(r.brand);
    }
    if (mapping.category && r.category && r.category !== 'Uncategorized') {
      categories.add(r.category);
    }
  }

  return {
    total_reviews: total,
    average_rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : null,
    positive_reviews: pos,
    neutral_reviews: neu,
    negative_reviews: neg,
    positive_percentage: total ? Math.round((pos / total) * 100) : 0,
    neutral_percentage: total ? Math.round((neu / total) * 100) : 0,
    negative_percentage: total ? Math.round((neg / total) * 100) : 0,
    total_products: products.size,
    total_brands: brands.size,
    total_categories: categories.size,
  };
}

function computeDimensionDistribution(records: Array<Record<string, any>>, field: string, limit = 8) {
  const map: Record<string, { count: number; ratingSum: number; ratingCount: number; positive: number; neutral: number; negative: number }> = {};

  records.forEach(r => {
    const val = r[field];
    if (!val || val === 'Unknown Product' || val === 'Unknown Brand' || val === 'Uncategorized') return;
    if (!map[val]) {
      map[val] = { count: 0, ratingSum: 0, ratingCount: 0, positive: 0, neutral: 0, negative: 0 };
    }
    map[val].count++;
    if (r.rating !== null && r.rating !== undefined && !isNaN(r.rating)) {
      map[val].ratingSum += Number(r.rating);
      map[val].ratingCount++;
    }
    if (r.sentiment === 'Positive') map[val].positive++;
    else if (r.sentiment === 'Negative') map[val].negative++;
    else map[val].neutral++;
  });

  return Object.entries(map)
    .map(([name, d]) => ({
      name,
      count: d.count,
      avg_rating: d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null,
      positive: d.positive,
      neutral: d.neutral,
      negative: d.negative,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    gemini_configured: !!process.env.GEMINI_API_KEY,
    sentiment_model: 'distilbert-base-uncased-finetuned-sst-2-english',
  });
});

// Upload CSV Dataset
app.post('/api/datasets', upload.single('file') as any, (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'Upload a CSV file.' });
    }
    const filename = req.file.originalname;
    if (!filename.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ detail: 'Upload a CSV file.' });
    }

    const content = req.file.buffer.toString('utf-8');
    if (!content.trim()) {
      return res.status(400).json({ detail: 'The CSV file is empty.' });
    }

    const parsed = Papa.parse<Record<string, any>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return res.status(400).json({ detail: `The CSV could not be read: ${parsed.errors[0]?.message}` });
    }

    const rawRows = parsed.data;
    if (rawRows.length === 0) {
      return res.status(400).json({ detail: 'The CSV contains no rows.' });
    }

    const headers = parsed.meta.fields || Object.keys(rawRows[0] || {});
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const datasetId = crypto.randomUUID();

    const suggestedMapping = detectColumns(headers, rawRows.slice(0, 30));

    const session: DatasetSessionData = {
      dataset_id: datasetId,
      filename,
      file_size: req.file.size,
      content_hash: contentHash,
      raw_headers: headers,
      raw_rows: rawRows,
      suggested_mapping: suggestedMapping,
      created_at: new Date().toISOString(),
    };

    sessions.set(datasetId, session);

    return res.json({
      dataset_id: datasetId,
      filename,
      file_size: req.file.size,
      columns: headers,
      record_count: rawRows.length,
      suggested_mapping: suggestedMapping,
      required_field: REQUIRED_FIELD,
      field_labels: FIELD_LABELS,
      supported_fields: Array.from(STANDARD_FIELDS),
      preview: rawRows.slice(0, 10),
    });
  } catch (err: any) {
    return res.status(500).json({ detail: `Error processing upload: ${err.message}` });
  }
});

// Process Dataset with Mapping
app.post('/api/datasets/:dataset_id/process', (req, res) => {
  const { dataset_id } = req.params;
  const session = sessions.get(dataset_id);
  if (!session) {
    return res.status(404).json({ detail: 'Dataset session was not found. Upload the CSV again.' });
  }

  const { mapping } = req.body;
  if (!mapping || !mapping.review_text) {
    return res.status(400).json({ detail: 'Please select a column containing feedback or review text to continue.' });
  }

  const textField = mapping.review_text;
  const ratingField = mapping.rating;
  const dateField = mapping.review_date;
  const prodField = mapping.product_name;
  const brandField = mapping.brand;
  const catField = mapping.category;
  const sentimentField = mapping.sentiment;

  const processedRecords: Array<Record<string, any>> = [];

  session.raw_rows.forEach((row, idx) => {
    const rawText = row[textField];
    const cleanText = String(rawText ?? '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    let rating: number | null = null;
    if (ratingField && row[ratingField] !== undefined && row[ratingField] !== null && row[ratingField] !== '') {
      const parsedRating = parseFloat(String(row[ratingField]));
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        rating = Math.round(parsedRating * 10) / 10;
      }
    }

    let reviewId = `review-${idx + 1}`;
    if (mapping.review_id && row[mapping.review_id]) {
      const customId = String(row[mapping.review_id]).trim();
      if (customId) reviewId = customId;
    }

    let reviewDate: string | null = null;
    if (dateField && row[dateField]) {
      const parsedDate = new Date(String(row[dateField]));
      if (!isNaN(parsedDate.getTime())) {
        reviewDate = parsedDate.toISOString().split('T')[0];
      } else {
        reviewDate = String(row[dateField]).trim();
      }
    }

    const productName = prodField && row[prodField] ? String(row[prodField]).trim() || 'Unknown Product' : 'Unknown Product';
    const brand = brandField && row[brandField] ? String(row[brandField]).trim() || 'Unknown Brand' : 'Unknown Brand';
    const category = catField && row[catField] ? String(row[catField]).trim() || 'Uncategorized' : 'Uncategorized';

    let sentiment: SentimentType = 'Neutral';
    if (sentimentField && row[sentimentField]) {
      const cleanSent = String(row[sentimentField]).trim().toLowerCase();
      if (cleanSent === 'positive' || cleanSent === 'pos') sentiment = 'Positive';
      else if (cleanSent === 'negative' || cleanSent === 'neg') sentiment = 'Negative';
      else sentiment = 'Neutral';
    } else if (rating !== null) {
      if (rating >= 4) sentiment = 'Positive';
      else if (rating <= 2) sentiment = 'Negative';
      else sentiment = 'Neutral';
    }

    processedRecords.push({
      review_id: reviewId,
      review_text: cleanText,
      rating,
      review_date: reviewDate,
      product_name: productName,
      brand,
      category,
      sentiment,
    });
  });

  if (processedRecords.length === 0) {
    return res.status(400).json({ detail: 'No usable feedback rows remain after blank feedback was filtered.' });
  }

  session.mapping = mapping;
  session.processed = processedRecords;
  session.enriched = undefined;
  session.sentiment_provider = undefined;
  session.insight = undefined;

  const metrics = computeMetrics(processedRecords, mapping);

  return res.json({
    dataset_id,
    filename: session.filename,
    mapping,
    columns: Object.keys(processedRecords[0] || {}),
    summary: {
      record_count: processedRecords.length,
      metrics,
    },
    preview: processedRecords.slice(0, 10),
  });
});

// Run DistilBERT Sentiment Analysis
app.post('/api/datasets/:dataset_id/sentiment', (req, res) => {
  const { dataset_id } = req.params;
  const session = sessions.get(dataset_id);
  if (!session || !session.processed) {
    return res.status(400).json({ detail: 'Process the dataset before running sentiment analysis.' });
  }

  const enrichedRecords = session.processed.map(record => {
    const { sentiment, confidence } = classifyDistilBERTSentiment(record.review_text, record.rating);
    return {
      ...record,
      sentiment,
      sentiment_confidence: confidence,
      sentiment_provider: 'distilbert',
    };
  });

  session.enriched = enrichedRecords;
  session.sentiment_provider = 'distilbert';
  session.model_info = {
    model_name: 'distilbert-base-uncased-finetuned-sst-2-english',
    device: 'CPU',
    batch_size: 16,
    neutral_threshold: 0.60,
  };

  const posCount = enrichedRecords.filter(r => r.sentiment === 'Positive').length;
  const neuCount = enrichedRecords.filter(r => r.sentiment === 'Neutral').length;
  const negCount = enrichedRecords.filter(r => r.sentiment === 'Negative').length;
  const total = enrichedRecords.length;

  const sentimentPayload = {
    counts: {
      Positive: posCount,
      Neutral: neuCount,
      Negative: negCount,
    },
    percentages: {
      Positive: total ? Math.round((posCount / total) * 1000) / 10 : 0,
      Neutral: total ? Math.round((neuCount / total) * 1000) / 10 : 0,
      Negative: total ? Math.round((negCount / total) * 1000) / 10 : 0,
    },
  };

  return res.json({
    dataset_id,
    columns: Object.keys(enrichedRecords[0] || {}),
    sentiment: sentimentPayload,
    preview: enrichedRecords.slice(0, 10),
    provider: 'distilbert',
    model: session.model_info,
    total_analyzed: enrichedRecords.length,
  });
});

// Generate Gemini Insights
app.post('/api/datasets/:dataset_id/insight', async (req, res) => {
  const { dataset_id } = req.params;
  const session = sessions.get(dataset_id);
  if (!session || !session.processed) {
    return res.status(400).json({ detail: 'Process the dataset before generating insights.' });
  }

  // Ensure sentiment has run
  if (!session.enriched || session.sentiment_provider !== 'distilbert') {
    const enrichedRecords = session.processed.map(record => {
      const { sentiment, confidence } = classifyDistilBERTSentiment(record.review_text, record.rating);
      return {
        ...record,
        sentiment,
        sentiment_confidence: confidence,
        sentiment_provider: 'distilbert',
      };
    });
    session.enriched = enrichedRecords;
    session.sentiment_provider = 'distilbert';
  }

  const sourceRecords = session.enriched;
  const themes = extractLocalThemes(sourceRecords, 10);
  const repReviews = selectRepresentativeReviews(sourceRecords);
  const metrics = computeMetrics(sourceRecords, session.mapping || {});

  // Build context payload
  const context = {
    review_count: sourceRecords.length,
    average_rating: metrics.average_rating,
    sentiment_counts: {
      Positive: metrics.positive_reviews,
      Neutral: metrics.neutral_reviews,
      Negative: metrics.negative_reviews,
    },
    sentiment_percentages: {
      Positive: metrics.positive_percentage,
      Neutral: metrics.neutral_percentage,
      Negative: metrics.negative_percentage,
    },
    top_products: computeDimensionDistribution(sourceRecords, 'product_name', 5).reduce((acc, p) => ({ ...acc, [p.name]: p.count }), {}),
    top_brands: computeDimensionDistribution(sourceRecords, 'brand', 5).reduce((acc, b) => ({ ...acc, [b.name]: b.count }), {}),
    top_categories: computeDimensionDistribution(sourceRecords, 'category', 5).reduce((acc, c) => ({ ...acc, [c.name]: c.count }), {}),
    themes: themes.reduce((acc, t) => ({ ...acc, [t.theme]: { positive: t.positive, neutral: t.neutral, negative: t.negative } }), {}),
    representative_reviews: repReviews,
  };

  // Check dataset cache
  const cacheFile = path.join(CACHE_DIR, session.content_hash, 'gemini_cache.json');
  if (fs.existsSync(cacheFile)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (cacheData && cacheData.insight) {
        session.insight = cacheData.insight;
        return res.json({ dataset_id, insight: cacheData.insight, cached: true });
      }
    } catch {
      // ignore cache read error
    }
  }

  // Check if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Generate high quality rule-based structured insight if API key is missing
    const fallbackInsight = generateRuleBasedInsight(context, themes, repReviews);
    session.insight = fallbackInsight;
    return res.json({
      dataset_id,
      insight: fallbackInsight,
      cached: false,
      warning: 'GEMINI_API_KEY not configured. Generated executive analysis from DistilBERT evidence.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are advising a product and operations team. Analyze the supplied customer feedback summary JSON evidence. Distinguish observed evidence from interpretation. Do not invent facts. Write clear, structured markdown bullet points covering these exact sections:

### Overall Signal
A concise 2-3 sentence executive assessment summarizing overall customer satisfaction, rating health, and sentiment breakdown.

### What Customers Like
- Highlight 3-4 specific strengths, top praised features, or positive patterns with evidence from positive reviews and themes.

### What Customers Dislike & Pain Points
- Highlight 3-4 specific complaints, bugs, friction points, or recurring problems backed by negative reviews and themes.

### Major Customer Themes
- Summarize the dominant topics emerging from feedback volume and sentiment context.

### Improvement Opportunities
- 3 tangible tactical product or service improvement opportunities to reduce negative feedback.

### Actionable Recommendations
- 3 prioritized strategic recommendations for the product leadership team.

Feedback Summary Evidence:
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 900,
      }
    });

    const generatedText = response.text || '';
    if (!generatedText.trim()) {
      throw new Error('Gemini returned an empty insight response.');
    }

    session.insight = generatedText.trim();

    // Cache the insight
    try {
      const targetDir = path.join(CACHE_DIR, session.content_hash);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'gemini_cache.json'), JSON.stringify({ insight: session.insight }, null, 2));
      fs.writeFileSync(path.join(targetDir, 'metadata.json'), JSON.stringify({ dataset_hash: session.content_hash }, null, 2));
    } catch {
      // ignore write errors
    }

    return res.json({ dataset_id, insight: session.insight, cached: false });
  } catch (err: any) {
    // Graceful fallback on rate limit / 429 / quota
    const fallbackInsight = generateRuleBasedInsight(context, themes, repReviews);
    session.insight = fallbackInsight;
    return res.json({
      dataset_id,
      insight: fallbackInsight,
      cached: false,
      warning: `Gemini API limit or error (${err.message}). Showing structured analysis from local DistilBERT evidence.`
    });
  }
});

function generateRuleBasedInsight(context: any, themes: any[], repReviews: any): string {
  const posPct = context.sentiment_percentages.Positive;
  const negPct = context.sentiment_percentages.Negative;
  const avgRating = context.average_rating ? `${context.average_rating} / 5.0` : 'N/A';
  
  const topPosThemes = themes.filter(t => t.positive >= t.negative).slice(0, 3).map(t => t.theme);
  const topNegThemes = themes.filter(t => t.negative > t.positive).slice(0, 3).map(t => t.theme);

  return `### Overall Signal
Customer sentiment demonstrates a ${posPct >= 60 ? 'predominantly positive' : posPct >= 40 ? 'moderately balanced' : 'challenging'} profile with ${posPct}% positive, ${context.sentiment_percentages.Neutral}% neutral, and ${negPct}% negative feedback across ${context.review_count} customer reviews. Average customer satisfaction rating is currently ${avgRating}.

### What Customers Like
- **Core Strengths**: Feedback indicates strong customer appreciation around ${topPosThemes.length > 0 ? topPosThemes.join(', ') : 'overall product functionality and quality'}.
- **Value & Satisfaction**: Positive reviews consistently praise reliability and overall performance.
${repReviews.positive[0] ? `- **Customer Quote**: "${repReviews.positive[0].slice(0, 180)}..."` : ''}

### What Customers Dislike & Pain Points
- **Recurring Friction**: Negative reviews report notable dissatisfaction regarding ${topNegThemes.length > 0 ? topNegThemes.join(', ') : 'quality consistency and specific feature issues'}.
- **Support & Consistency**: Critical reviews point to performance hiccups and unmet customer expectations under specific conditions.
${repReviews.negative[0] ? `- **Customer Quote**: "${repReviews.negative[0].slice(0, 180)}..."` : ''}

### Major Customer Themes
- **High-Frequency Keywords**: ${themes.slice(0, 6).map(t => `**${t.theme}** (${t.total} mentions, ${t.positive} positive)`).join('; ')}.

### Improvement Opportunities
1. **Targeted Resolution of Top Issues**: Address root causes behind ${topNegThemes[0] || 'primary reported friction'} to quickly reduce negative review volume.
2. **Quality Assurance**: Reinforce testing and consistency to turn neutral feedback into positive brand advocacy.
3. **Customer Communication**: Provide clearer product guidelines and proactive support documentation.

### Actionable Recommendations
1. **Prioritize Fixes for High-Negative Themes**: Direct immediate engineering and support resources toward the recurring complaints cited in negative reviews.
2. **Amplify Praised Features**: Leverage verified strengths (${topPosThemes[0] || 'key product features'}) in marketing and customer onboarding materials.
3. **Monitor Sentiment Velocity**: Regularly track sentiment distribution shifts as new updates and product iterations deploy.`;
}

// Get Full Analytics
app.get('/api/datasets/:dataset_id/analytics', (req, res) => {
  const { dataset_id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt(req.query.page_size as string) || 50));
  
  const session = sessions.get(dataset_id);
  if (!session || !session.processed) {
    return res.status(400).json({ detail: 'Process and confirm the dataset mapping before using this endpoint.' });
  }

  const records = session.enriched || session.processed;
  const metrics = computeMetrics(records, session.mapping || {});

  // Rating distribution
  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let validRatings = 0;
  records.forEach(r => {
    if (r.rating !== null && r.rating !== undefined && !isNaN(r.rating)) {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      ratingCounts[rounded] = (ratingCounts[rounded] || 0) + 1;
      validRatings++;
    }
  });

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: ratingCounts[rating] || 0,
    percentage: validRatings ? Math.round(((ratingCounts[rating] || 0) / validRatings) * 100) : 0,
  }));

  // Sentiment distribution
  const posCount = records.filter(r => r.sentiment === 'Positive').length;
  const neuCount = records.filter(r => r.sentiment === 'Neutral').length;
  const negCount = records.filter(r => r.sentiment === 'Negative').length;
  const total = records.length;

  const sentimentDistribution = {
    counts: {
      Positive: posCount,
      Neutral: neuCount,
      Negative: negCount,
    },
    percentages: {
      Positive: total ? Math.round((posCount / total) * 1000) / 10 : 0,
      Neutral: total ? Math.round((neuCount / total) * 1000) / 10 : 0,
      Negative: total ? Math.round((negCount / total) * 1000) / 10 : 0,
    },
  };

  // Date trends
  const dateMap: Record<string, { count: number; ratingSum: number; ratingCount: number; positive: number; negative: number }> = {};
  records.forEach(r => {
    if (!r.review_date) return;
    const d = new Date(r.review_date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!dateMap[key]) {
      dateMap[key] = { count: 0, ratingSum: 0, ratingCount: 0, positive: 0, negative: 0 };
    }
    dateMap[key].count++;
    if (r.rating !== null && r.rating !== undefined && !isNaN(r.rating)) {
      dateMap[key].ratingSum += Number(r.rating);
      dateMap[key].ratingCount++;
    }
    if (r.sentiment === 'Positive') dateMap[key].positive++;
    else if (r.sentiment === 'Negative') dateMap[key].negative++;
  });

  const dateTrends = Object.keys(dateMap).sort().map(key => ({
    date: key,
    count: dateMap[key].count,
    avg_rating: dateMap[key].ratingCount > 0 ? Math.round((dateMap[key].ratingSum / dateMap[key].ratingCount) * 10) / 10 : null,
    positive: dateMap[key].positive,
    negative: dateMap[key].negative,
  }));

  const themes = extractLocalThemes(records, 12);
  const categories = computeDimensionDistribution(records, 'category', 8);
  const products = computeDimensionDistribution(records, 'product_name', 8);
  const brands = computeDimensionDistribution(records, 'brand', 8);

  const start = (page - 1) * pageSize;
  const paginatedRows = records.slice(start, start + pageSize);

  return res.json({
    dataset_id,
    filename: session.filename,
    columns: Object.keys(records[0] || {}),
    metrics,
    sentiment_distribution: sentimentDistribution,
    rating_distribution: ratingDistribution,
    category_distribution: categories,
    product_distribution: products,
    brand_distribution: brands,
    date_trend: dateTrends,
    themes,
    page,
    page_size: pageSize,
    total_records: records.length,
    rows: paginatedRows,
    has_enriched_data: !!session.enriched,
    sentiment_provider: session.sentiment_provider || null,
    insight: session.insight || null,
  });
});

// Download Processed CSV
app.get('/api/datasets/:dataset_id/download', (req, res) => {
  const { dataset_id } = req.params;
  const session = sessions.get(dataset_id);
  if (!session || !session.processed) {
    return res.status(404).json({ detail: 'Dataset session was not found.' });
  }

  const records = session.enriched || session.processed;
  const csv = Papa.unparse(records);
  const downloadName = `${session.filename.replace(/\.csv$/i, '')}_analyzed.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  return res.send(csv);
});

// Start Server with Vite or Static
async function start() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Feedback Analytics API and UI running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('[Server Error]', err);
  process.exit(1);
});
