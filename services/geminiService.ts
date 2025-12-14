
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, GeneratedSection, ReferenceImage, DouyinSectionType } from "../types";
import { loadSettings } from "./storageService";

// Helper to determine the active API Key
const getApiKey = () => {
  const settings = loadSettings();
  // Prefer custom user key, fall back to env key
  const apiKey = settings.googleApiKey?.trim() || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not set. Please configure it in settings.");
  }
  return apiKey;
};

// Initialize generic client
const getAiClient = () => {
  const apiKey = getApiKey();
  const settings = loadSettings();
  const options: any = { apiKey };
  
  if (settings.proxyUrl && settings.proxyUrl.trim() !== '') {
    options.baseUrl = settings.proxyUrl.trim();
  }

  return new GoogleGenAI(options);
};

// --- IMAGE COMPRESSION HELPER ---
// Resizes image to max 1024px dimension and converts to JPEG to reduce payload size
const compressImage = (base64Str: string, mimeType: string): Promise<{ data: string, mimeType: string }> => {
  return new Promise((resolve) => {
    // If it's already a small-ish jpeg, maybe skip? But safer to standardize.
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Str}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Max dimension 1024px
      const MAX_SIZE = 1024;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // Export as JPEG quality 0.8
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve({
        data: newDataUrl.split(',')[1],
        mimeType: 'image/jpeg'
      });
    };
    img.onerror = () => {
      // Fallback to original if loading fails
      resolve({ data: base64Str, mimeType });
    };
  });
};

// Exported function to verify API Key validity
export const testGoogleApiKey = async (apiKey: string, proxyUrl?: string): Promise<boolean> => {
  if (!apiKey) return false;
  
  const options: any = { apiKey };
  if (proxyUrl && proxyUrl.trim() !== '') {
    options.baseUrl = proxyUrl.trim();
  }

  const ai = new GoogleGenAI(options);
  try {
    // CRITICAL: Test with the ACTUAL model
    // Removed 'imageSize: 1K' explicit config to rely on defaults, matching the robust logic.
    await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        { 
          role: 'user', 
          parts: [{ text: 'A small red cube, white background' }] 
        }
      ],
      config: {
        imageConfig: {
           aspectRatio: "1:1"
           // Removed imageSize to avoid permission issues
        }
      }
    });
    return true;
  } catch (e) {
    console.error("API Key Test Failed", e);
    throw e;
  }
};

export const analyzeProductData = async (
  images: ReferenceImage[],
  name: string,
  features: string,
  language: 'zh' | 'en'
): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const targetLanguage = language === 'zh' ? 'Simplified Chinese (简体中文)' : 'English';

  const promptText = `
    Role: Senior Douyin (TikTok) E-commerce Visual Designer & Copywriter.
    Target Audience: ${targetLanguage} speakers.
    Product: ${name}
    Features: ${features}

    YOUR TASK:
    Plan the content for a high-conversion product page. 
    You must output TWO parts: 
    1. A plan for 5 Specific Main Images (Hero Carousel).
    2. A plan for the Detail Page (Long Image) structure.

    PART 1: 5 MAIN IMAGES (Hero Carousel) Rules:
    1. **Front View (front_80)**: Product full frontal view, 80% screen occupancy, pure white background. Clean and official.
    2. **Side/Fit View (side_cut)**: Side angle showing the cut, silhouette, or thickness.
    3. **Detail Zoom (detail_zoom)**: Extreme close-up of texture/material + "Value Proposition" overlay text.
    4. **Scenario (scenario_life)**: Lifestyle/In-use context. Emotional connection.
    5. **Trust/Brand (trust_brand)**: Brand packaging, quality control tag, or "Official Authentic" seal style.

    PART 2: DETAIL PAGE FRAMEWORK (8 Modules):
    1. **Impact Header (header_impact)**: Visual shock, Promo info, Coupon. 
    2. **Product Display (product_display)**: High-quality Front or Side angle. Showing the full product cleanly.
    3. **Core Selling Points (selling_point_fabe)**: Use FABE (Feature-Advantage-Benefit-Evidence). Focus on solution.
    4. **Scenario Application (scenario_usage)**: Lifestyle context. Show user using it. 代入感.
    5. **Detail/Craftsmanship (detail_craft)**: Close-up zoom. Texture, material, stitching, quality proof.
    6. **Specs/Size (specs_size)**: Data table, size chart, package list. (Text mainly).
    7. **Trust/Endorsement (trust_endorsement)**: Brand promise, certifications, after-sales, reviews.
    8. **Promotion CTA (promotion_cta)**: Urgency, "Buy Now", final call.

    IMAGE SELECTION RULES:
    I have provided multiple images with IDs and LABELS. You MUST select the most appropriate 'referenceImageId' for each section.
    - For 'front_80', 'product_display', prefer 'main' labeled images.
    - For 'detail_zoom', 'detail_craft', prefer 'detail' or 'texture' labeled images.
    - For 'scenario_life', 'scenario_usage', prefer 'usage' labeled images if available, otherwise 'main'.
    
    CRITICAL: Ensure that the 'referenceImageId' matches one of the provided Image IDs exactly.

    OUTPUT REQUIREMENTS:
    - Generate strictly JSON.
    - 'imagePrompt': Detailed ENGLISH prompt for Gemini 3 Pro Image Generation.
       * Include lighting (studio, natural), angle (front, flat lay), and style (C4D, photography).
       * Keep the product identity from the reference image.
    - 'overlayText': 2-5 words, punchy, poster style.
    - 'content': Persuasive sales copy.
  `;

  // Compress all images for analysis to save tokens/bandwidth
  const processedImages = await Promise.all(images.map(async (img) => {
      const { data, mimeType } = await compressImage(img.base64, img.mimeType);
      return { ...img, base64: data, mimeType };
  }));

  const parts: any[] = [];
  
  processedImages.forEach(img => {
    parts.push({ text: `Image ID: "${img.id}" - Label: ${img.label}` });
    parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
  });

  parts.push({ text: promptText });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      refinedTitle: { type: Type.STRING },
      refinedSellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      priceEstimate: { type: Type.STRING },
      marketingTone: { type: Type.STRING },
      heroImages: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { 
              type: Type.STRING, 
              enum: ['front_80', 'side_cut', 'detail_zoom', 'scenario_life', 'trust_brand']
            },
            title: { type: Type.STRING, description: "Short title for the image type, e.g. Front View" },
            imagePrompt: { type: Type.STRING },
            referenceImageId: { type: Type.STRING }
          },
          required: ['id', 'type', 'title', 'imagePrompt', 'referenceImageId']
        }
      },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { 
              type: Type.STRING, 
              enum: [
                'header_impact', 
                'product_display', 
                'selling_point_fabe', 
                'scenario_usage', 
                'detail_craft', 
                'specs_size', 
                'trust_endorsement', 
                'promotion_cta'
              ] 
            },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            overlayText: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            referenceImageId: { type: Type.STRING }
          },
          required: ['id', 'type', 'title', 'content', 'overlayText', 'imagePrompt', 'referenceImageId']
        }
      }
    },
    required: ['refinedTitle', 'refinedSellingPoints', 'priceEstimate', 'marketingTone', 'heroImages', 'sections']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      systemInstruction: "You are a specialized e-commerce content strategist. Generate strict JSON output."
    }
  });

  if (!response.text) throw new Error("No analysis generated");
  return JSON.parse(response.text) as AnalysisResult;
};

export const generateProductImage = async (
  referenceImageBase64: string,
  referenceMimeType: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();

  // 1. COMPRESS IMAGE BEFORE SENDING
  // This aligns with the "working" app which likely deals with manageable payloads.
  // Converting to JPEG also standardizes the mime type.
  const { data: compressedData, mimeType: compressedMime } = await compressImage(referenceImageBase64, referenceMimeType);

  try {
    // 2. STRICT REQUEST STRUCTURE
    // Using explicit 'contents: [{ role: user, parts: [] }]' matches the standard most likely to succeed.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a high-quality e-commerce image.
              CONTEXT: ${prompt}
              CONSTRAINT: The main product from the reference image MUST appear clearly.
              STYLE: Commercial photography, high resolution, sharp details.` 
            },
            {
              inlineData: {
                data: compressedData,
                mimeType: compressedMime,
              },
            }
          ],
        }
      ],
      config: {
        imageConfig: {
            aspectRatio: "1:1",
            // CRITICAL FIX: Removed 'imageSize: "2K"'.
            // The "Infinite Heroes" app does NOT set imageSize, implying the default (1K) works.
            // 2K often requires specific billing/permissions that trigger 403.
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");

  } catch (error) {
    console.error("Image generation failed", error);
    // Add clearer error if 403
    if (error instanceof Error && error.message.includes('403')) {
       throw new Error("Permission Denied (403). It seems your API Key supports the model but not 2K resolution or the payload was too large. (Optimization applied, please retry).");
    }
    throw error;
  }
};


// ------------------------------------------------------------------
// VIDEO GENERATION (Google Veo & Custom Grok)
// ------------------------------------------------------------------

// 1. Google Veo Implementation
const generateVeoVideo = async (
  imageBytes: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();
  const apiKey = getApiKey();
  const settings = loadSettings();
  
  // Clean base64 just in case
  const cleanBase64 = imageBytes.replace(/^data:image\/\w+;base64,/, "");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: cleanBase64,
      mimeType: mimeType || 'image/png',
    },
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI in response");

  // Fetch the actual video bytes
  let fetchUrl = `${videoUri}&key=${apiKey}`;

  // PROXY FIX: If using a proxy, we must rewrite the download URL to go through the proxy as well
  if (settings.proxyUrl && settings.proxyUrl.trim() !== '') {
    // Standard Google API base for files
    const googleBase = 'https://generativelanguage.googleapis.com';
    // Remove trailing slash from proxy url for clean replacement
    const proxyBase = settings.proxyUrl.trim().replace(/\/$/, '');
    
    if (fetchUrl.startsWith(googleBase)) {
      fetchUrl = fetchUrl.replace(googleBase, proxyBase);
    }
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`Failed to download video bytes: ${response.status}`);
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// 2. Grok API Implementation
const generateGrokVideo = async (
  imageBytes: string, // Full data URI
  prompt: string,
  apiKey: string | undefined
): Promise<string> => {
  if (!apiKey) throw new Error("Grok API Key is missing. Please set it in Settings.");

  const cleanBase64 = imageBytes.replace(/^data:image\/\w+;base64,/, "");
  
  // A. Start Generation
  const generateRes = await fetch('https://mysql.aigcagent.top/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      image_base64: cleanBase64,
      image_name: 'input.png',
      prompt: prompt || 'slow motion cinematic shot',
      mode: 'normal',
      video_length: 6
    })
  });

  if (!generateRes.ok) {
    throw new Error(`Grok Generation Failed: ${generateRes.statusText}`);
  }

  const genData = await generateRes.json();
  if (!genData.success || !genData.task_id) {
    throw new Error(`Grok Error: ${genData.error || 'Unknown error'}`);
  }

  const taskId = genData.task_id;

  // B. Poll Status
  const maxAttempts = 60; // 5 minutes max (5s interval)
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusRes = await fetch(`https://mysql.aigcagent.top/api/task/${taskId}`, {
      headers: { 'X-API-Key': apiKey }
    });
    
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.status === 'completed' && statusData.video_url) {
        return statusData.video_url; // Return the URL directly
      }
      if (statusData.status === 'failed') {
         throw new Error(`Grok Task Failed: ${statusData.error}`);
      }
    }
  }
  
  throw new Error("Video generation timed out");
};


export const generateProductVideo = async (
  imageBytes: string,
  imageMimeType: string,
  prompt: string
): Promise<string> => {
  const settings = loadSettings();
  const provider = settings.videoProvider || 'google';

  if (provider === 'grok') {
    return generateGrokVideo(imageBytes, prompt, settings.grokApiKey);
  } else {
    return generateVeoVideo(imageBytes, imageMimeType, prompt);
  }
};
