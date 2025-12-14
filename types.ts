
export enum ProcessingStep {
  Input = 'INPUT',
  Analyzing = 'ANALYZING',
  Planning = 'PLANNING', // New step for reviewing the plan before generation
  Preview = 'PREVIEW',
}

export type ImageLabel = 'main' | 'detail' | 'texture' | 'usage' | 'other';

export interface ReferenceImage {
  id: string;
  base64: string;
  mimeType: string;
  label: ImageLabel;
}

export interface ProductInput {
  referenceImages: ReferenceImage[];
  name: string;
  features: string;
  targetAudience: string;
}

export type DouyinSectionType = 
  | 'header_impact'      // 首屏冲击区
  | 'product_display'    // 产品展示区 (Front/Side)
  | 'selling_point_fabe' // 核心卖点区 (FABE)
  | 'scenario_usage'     // 场景应用区
  | 'detail_craft'       // 细节工艺区
  | 'specs_size'         // 尺寸规格区
  | 'trust_endorsement'  // 信任背书区
  | 'promotion_cta';     // 促销转化区

export type HeroImageType = 'front_80' | 'side_cut' | 'detail_zoom' | 'scenario_life' | 'trust_brand';

export interface HeroImage {
  id: string;
  type: HeroImageType;
  title: string;
  imagePrompt: string;
  referenceImageId?: string;
  generatedImageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  isEditing?: boolean;
  // Video Generation Fields
  generatedVideoUrl?: string;
  videoStatus?: 'pending' | 'generating' | 'completed' | 'failed';
  videoPrompt?: string;
  isVideoEditing?: boolean;
}

export interface GeneratedSection {
  id: string;
  type: DouyinSectionType;
  title: string;
  content: string; // Long copy
  overlayText?: string; // Short poster text
  imagePrompt: string; // The prompt for the AI image generator
  referenceImageId?: string; // ID of the uploaded image to use as reference
  generatedImageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  isEditing?: boolean; // UI state for manual edit mode
}

export interface AnalysisResult {
  refinedTitle: string;
  refinedSellingPoints: string[];
  priceEstimate: string;
  marketingTone: string;
  heroImages: HeroImage[]; // The 5 Main Images
  sections: GeneratedSection[]; // The Detail Page "Long Image" Slices
}

export interface AppSettings {
  proxyUrl?: string; // e.g., http://127.0.0.1:7890
  googleApiKey?: string; // Custom Google API Key for Pro models
  videoProvider?: 'google' | 'grok';
  grokApiKey?: string;
}
