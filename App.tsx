
import React, { useState, useEffect, useRef } from 'react';
import { ProcessingStep, ProductInput, AnalysisResult, GeneratedSection, HeroImage } from './types';
import { analyzeProductData, generateProductImage, generateProductVideo } from './services/geminiService';
import { saveAppState, loadAppState, clearAppState } from './services/storageService';
import InputStep from './components/InputStep';
import Preview from './components/Preview';
import SectionControl from './components/SectionControl';
import CarouselControl from './components/CarouselControl';
import LoadingOverlay from './components/LoadingOverlay';
import SettingsModal from './components/SettingsModal';
import { translations } from './constants/translations';
import { Wand2, AlertCircle, Globe, Download, Loader2, Layers, RotateCcw, CheckCircle, Settings } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [step, setStep] = useState<ProcessingStep>(ProcessingStep.Input);
  const [inputData, setInputData] = useState<ProductInput | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Storage state
  const [isRestored, setIsRestored] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const t = translations[language];

  // 1. Load persisted state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await loadAppState();
        if (savedState && savedState.step !== ProcessingStep.Input) {
           setInputData(savedState.inputData);
           setAnalysis(savedState.analysis);
           setStep(savedState.step);
           setIsRestored(true);
           setLastSaved(savedState.timestamp);
           // Auto-hide restored message
           setTimeout(() => setIsRestored(false), 3000);
        }
      } catch (e) {
        console.error("Error restoring state", e);
      } finally {
        setIsLoadingState(false);
      }
    };
    loadState();
  }, []);

  // 2. Auto-save state when critical data changes
  useEffect(() => {
    if (step !== ProcessingStep.Input && analysis && inputData && !isLoadingState) {
      const timer = setTimeout(() => {
        saveAppState({ inputData, analysis, step });
        setLastSaved(Date.now());
      }, 1000); // Debounce 1s
      return () => clearTimeout(timer);
    }
  }, [inputData, analysis, step, isLoadingState]);

  const handleReset = async () => {
    if (window.confirm(t.resetConfirm)) {
      await clearAppState();
      setInputData(null);
      setAnalysis(null);
      setStep(ProcessingStep.Input);
      setLastSaved(null);
    }
  };

  const handleStart = async (data: ProductInput) => {
    setInputData(data);
    setStep(ProcessingStep.Analyzing);
    setError(null);
    
    // Clear previous draft immediately when starting new
    await clearAppState();

    try {
      // 1. Analyze Product
      const result = await analyzeProductData(
        data.referenceImages,
        data.name,
        data.features + (data.targetAudience ? ` Target Audience: ${data.targetAudience}` : ''),
        language
      );
      
      // Initialize status for detail sections
      const sectionsWithStatus = result.sections.map(s => ({
        ...s,
        status: s.type === 'specs_size' || s.type === 'trust_endorsement' ? 'completed' : 'pending',
        isEditing: false
      })) as GeneratedSection[];

      // Initialize status for hero images
      const heroImagesWithStatus = result.heroImages.map(h => ({
        ...h,
        status: 'pending',
        isEditing: false,
        videoStatus: 'pending' // Initialize video status
      })) as HeroImage[];

      setAnalysis({ ...result, sections: sectionsWithStatus, heroImages: heroImagesWithStatus });
      setStep(ProcessingStep.Planning); // Move to Planning/Execution phase

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during processing.");
      setStep(ProcessingStep.Input);
    }
  };

  // Helper to get image URL for a section or hero image
  const generateImageForItem = async (
    itemId: string, 
    referenceImageId: string | undefined, 
    prompt: string,
    stateUpdater: (status: 'generating' | 'completed' | 'failed', url?: string) => void
  ) => {
    if (!inputData) return;
    
    stateUpdater('generating');

    try {
       // Find specific reference image
      let refImg = inputData.referenceImages.find(img => img.id === referenceImageId);
      if (!refImg) {
        refImg = inputData.referenceImages.find(img => img.label === 'main') || inputData.referenceImages[0];
      }
      if (!refImg) throw new Error("No reference image available");

      const imageUrl = await generateProductImage(
        refImg.base64,
        refImg.mimeType,
        prompt
      );

      stateUpdater('completed', imageUrl);
    } catch (e: any) {
      console.error(`Failed to generate image for ${itemId}`, e);
      stateUpdater('failed');

      // INTELLIGENT ERROR HANDLING FOR API KEYS
      if (e.message.includes('403') || e.message.includes('Permission Denied')) {
        setError(t.apiKeyError);
        setShowSettings(true); // Automatically open settings if 403 occurs
      } else {
        setError(e.message || "Image generation failed. Please try again.");
      }
    }
  };

  // Helper for video generation
  const handleGenerateHeroVideo = async (heroId: string) => {
    if (!analysis) return;
    const hero = analysis.heroImages.find(h => h.id === heroId);
    if (!hero) return;
    if (!hero.generatedImageUrl) {
       alert("Please generate an image first before generating a video.");
       return;
    }

    // Update Status to generating
    setAnalysis(prev => {
       if (!prev) return null;
       return {
         ...prev,
         heroImages: prev.heroImages.map(h => h.id === heroId ? { ...h, videoStatus: 'generating' } : h)
       };
    });

    try {
       // We use the Generated Image as input for the video
       const videoUrl = await generateProductVideo(
          hero.generatedImageUrl, // It's a data URI
          'image/png', // Assume PNG for generated images
          hero.videoPrompt || "Slow cinematic pan"
       );

       setAnalysis(prev => {
         if (!prev) return null;
         return {
           ...prev,
           heroImages: prev.heroImages.map(h => h.id === heroId ? { ...h, videoStatus: 'completed', generatedVideoUrl: videoUrl } : h)
         };
       });
    } catch (e: any) {
       console.error("Video Gen Failed", e);
       setError(`Video Generation Failed: ${e.message}`);
       
       if (e.message.includes('403') || e.message.includes('Permission Denied')) {
          setShowSettings(true);
       }

       setAnalysis(prev => {
         if (!prev) return null;
         return {
           ...prev,
           heroImages: prev.heroImages.map(h => h.id === heroId ? { ...h, videoStatus: 'failed' } : h)
         };
       });
    }
  };

  const handleGenerateSection = async (sectionId: string) => {
    if (!analysis) return;
    const section = analysis.sections.find(s => s.id === sectionId);
    if (!section) return;

    await generateImageForItem(
      sectionId, 
      section.referenceImageId, 
      section.imagePrompt,
      (status, url) => {
        setAnalysis(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? { ...s, status, generatedImageUrl: url } : s)
          };
        });
      }
    );
  };

  const handleGenerateHeroImage = async (heroId: string) => {
    if (!analysis) return;
    const hero = analysis.heroImages.find(h => h.id === heroId);
    if (!hero) return;

    await generateImageForItem(
      heroId, 
      hero.referenceImageId, 
      hero.imagePrompt,
      (status, url) => {
        setAnalysis(prev => {
          if (!prev) return null;
          return {
            ...prev,
            heroImages: prev.heroImages.map(h => h.id === heroId ? { ...h, status, generatedImageUrl: url } : h)
          };
        });
      }
    );
  };

  const handleUpdateSection = (id: string, updates: Partial<GeneratedSection>) => {
    setAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
      };
    });
  };

  const handleUpdateHeroImage = (id: string, updates: Partial<HeroImage>) => {
    setAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        heroImages: prev.heroImages.map(h => h.id === id ? { ...h, ...updates } : h)
      };
    });
  };

  const handleDeleteSection = (id: string) => {
    setAnalysis(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.filter(s => s.id !== id)
      };
    });
  };

  const handleDownloadPackage = async () => {
    if (!analysis) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      
      // Text Content
      let textContent = `# ${analysis.refinedTitle}\n\n`;
      textContent += `Price Estimate: ${analysis.priceEstimate}\n`;
      textContent += `Marketing Tone: ${analysis.marketingTone}\n\n`;
      
      // Hero Images
      const heroFolder = zip.folder("hero_images");
      analysis.heroImages.forEach((img, i) => {
        if (img.generatedImageUrl) {
          const base64Data = img.generatedImageUrl.split(',')[1];
          heroFolder?.file(`main_${i+1}_${img.type}.png`, base64Data, {base64: true});
        }
      });

      // Detail Sections
      const detailFolder = zip.folder("detail_sections");
      textContent += `## Section Details\n`;
      analysis.sections.forEach((section, index) => {
        textContent += `\n### ${index + 1}. ${section.title} [${section.type}]\n`;
        textContent += `Copy: ${section.content}\n`;
        if (section.generatedImageUrl) {
           const base64Data = section.generatedImageUrl.split(',')[1];
           detailFolder?.file(`${index+1}_${section.type}.png`, base64Data, {base64: true});
        }
      });
      
      zip.file("product_details.txt", textContent);

      const content = await zip.generateAsync({type:"blob"});
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${analysis.refinedTitle.replace(/\s+/g, '_')}_douyin_assets.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (e) {
      console.error("Failed to zip files", e);
      setError("Failed to create download package.");
    } finally {
      setIsZipping(false);
    }
  };

  if (isLoadingState) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans relative">
      
      {/* Global Loading Overlay */}
      {step === ProcessingStep.Analyzing && <LoadingOverlay lang={language} />}

      {/* Settings Modal */}
      <SettingsModal 
         isOpen={showSettings} 
         onClose={() => setShowSettings(false)} 
         lang={language} 
      />

      {/* Left Sidebar / Controls */}
      <div className="w-full lg:w-5/12 xl:w-2/5 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-20 overflow-y-auto">
        <div className="p-6 pb-2 border-b border-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                 <Wand2 size={16} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.appTitle}</h1>
            </div>
            
            <div className="flex gap-2">
              <button 
                 onClick={() => setShowSettings(true)}
                 className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${!analysis ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'}`}
                 title={t.settings}
              >
                <Settings size={16} />
              </button>
              {step !== ProcessingStep.Input && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
                  title={t.newProject}
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button 
                onClick={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
              >
                <Globe size={14} />
                {language === 'en' ? 'EN' : '中文'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold mb-1">Error</p>
                <p>{error}</p>
                {/* Add a shortcut button to open settings if API key error is suspected */}
                {(error.includes('Key') || error.includes('403')) && (
                   <button 
                     onClick={() => setShowSettings(true)} 
                     className="mt-2 text-xs font-bold underline hover:text-red-900"
                   >
                     {t.apiKeyManagement} &rarr;
                   </button>
                )}
              </div>
            </div>
          )}

          {isRestored && (
             <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-green-700 text-xs font-medium animate-pulse">
               <CheckCircle size={14} /> {t.draftRestored}
             </div>
          )}

          {step === ProcessingStep.Input && (
            <InputStep 
              onStart={handleStart} 
              isProcessing={false} 
              lang={language}
            />
          )}

          {(step !== ProcessingStep.Input && analysis) && (
            <div className="space-y-8">
              
              {/* Header Status */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Wand2 size={16} />
                    {t.planningStep}
                  </h3>
                  <div className="flex items-center gap-2">
                    {lastSaved && (
                       <span className="text-[10px] text-indigo-400 font-medium">{t.autoSaved}</span>
                    )}
                    <button 
                      onClick={handleDownloadPackage}
                      disabled={isZipping}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-xs font-bold shadow-sm"
                    >
                      {isZipping ? <Loader2 className="animate-spin" size={12}/> : <Download size={12} />}
                      {isZipping ? t.downloading : "ZIP"}
                    </button>
                  </div>
                </div>
                
                 {/* Analysis Info Chips */}
                 <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-white rounded text-indigo-700 font-medium border border-indigo-100">{analysis.refinedTitle}</span>
                    <span className="px-2 py-1 bg-white rounded text-indigo-700 font-medium border border-indigo-100">¥{analysis.priceEstimate}</span>
                 </div>
              </div>

              {/* 1. Main Images Control Group */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} />
                  {t.mainImages}
                </h4>
                <div className="grid grid-cols-1 gap-3">
                   {analysis.heroImages.map((hero, idx) => (
                      <CarouselControl 
                        key={hero.id}
                        index={idx}
                        heroImage={hero}
                        referenceImages={inputData?.referenceImages || []}
                        lang={language}
                        onUpdate={handleUpdateHeroImage}
                        onGenerate={handleGenerateHeroImage}
                        onGenerateVideo={handleGenerateHeroVideo}
                      />
                   ))}
                </div>
              </div>

              {/* 2. Detail Sections Control Group */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} />
                  {t.pageSections}
                </h4>
                <div className="space-y-4">
                  {analysis.sections.map((section, idx) => (
                    <SectionControl
                      key={section.id}
                      index={idx}
                      section={section}
                      referenceImages={inputData?.referenceImages || []}
                      lang={language}
                      onUpdate={handleUpdateSection}
                      onGenerate={handleGenerateSection}
                      onDelete={handleDeleteSection}
                    />
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Right Preview Area */}
      <div className="flex-1 bg-gray-100 min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{
               backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
               backgroundSize: '24px 24px'
             }}>
        </div>
        
        {analysis ? (
          <Preview 
            analysis={analysis} 
            referenceImages={inputData?.referenceImages || []} 
            lang={language}
          />
        ) : (
          <div className="text-center text-gray-400 max-w-sm">
             <div className="w-24 h-24 bg-gray-200 rounded-3xl mx-auto mb-6 opacity-50 rotate-3 border-4 border-white shadow-xl flex items-center justify-center">
                <Wand2 size={32} className="opacity-20"/>
             </div>
             <h3 className="text-lg font-medium mb-2">{t.previewAwaits}</h3>
             <p className="text-sm">{t.previewDesc}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default App;
