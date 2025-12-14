
import React, { useState, useRef } from 'react';
import { AnalysisResult, GeneratedSection, ReferenceImage, HeroImage } from '../types';
import { ShoppingBag, Share2, MoreHorizontal, ChevronLeft, MessageCircle, Store, ChevronRight, Wand2, Play } from 'lucide-react';
import { translations } from '../constants/translations';

interface PreviewProps {
  analysis: AnalysisResult;
  referenceImages: ReferenceImage[]; // Kept for fallback or logic if needed
  lang: 'zh' | 'en';
}

const Preview: React.FC<PreviewProps> = ({ analysis, lang }) => {
  const t = translations[lang];
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const renderSection = (section: GeneratedSection) => {
    const displayImage = section.generatedImageUrl;
    const isTextOnly = section.type === 'specs_size' || section.type === 'trust_endorsement';

    return (
      <div key={section.id} className="relative w-full mb-1 group">
        {!isTextOnly && (
          <div className="relative w-full bg-white">
             {displayImage ? (
                <div className="relative w-full">
                  <img src={displayImage} alt={section.title} className="w-full h-auto object-cover" />
                  {(section.type === 'header_impact' || section.type === 'promotion_cta' || section.overlayText) && (
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                      <h3 className="text-white font-bold text-xl leading-tight mb-2 drop-shadow-md">{section.overlayText || section.title}</h3>
                      <p className="text-white/90 text-sm leading-snug">{section.content}</p>
                    </div>
                  )}
                </div>
             ) : (
               <div className="w-full aspect-[4/5] bg-gray-50 flex flex-col items-center justify-center p-8 text-center border-b border-gray-100">
                  <div className="mb-3 text-gray-300">
                     {section.status === 'generating' ? (
                       <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                       <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300"></div>
                     )}
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.moduleTypes[section.type]}</span>
                  <p className="text-sm font-bold text-gray-900 mt-2">{section.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{section.content}</p>
               </div>
             )}
          </div>
        )}

        {isTextOnly && (
           <div className="bg-white p-6 mb-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center before:w-1 before:h-5 before:bg-orange-500 before:mr-3 before:rounded-full">
                {section.title}
              </h3>
              
              {section.type === 'specs_size' ? (
                <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
                  {section.content.split('\n').map((line, i) => {
                    const parts = line.split(':');
                    if (parts.length < 2) return <div key={i} className="p-3 bg-gray-50 border-b border-gray-100 text-gray-700">{line}</div>;
                    return (
                      <div key={i} className="flex border-b border-gray-100 last:border-0">
                        <div className="w-1/3 bg-gray-50 p-3 text-gray-500 font-medium">{parts[0]?.replace('-','').trim()}</div>
                        <div className="w-2/3 p-3 text-gray-800">{parts[1] || ''}</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                 <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl">
                   {section.content}
                 </div>
              )}
           </div>
        )}
      </div>
    );
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    const index = Math.round(scrollLeft / width);
    setActiveSlide(index);
  };

  const scrollPrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -scrollContainerRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: scrollContainerRef.current.clientWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-[375px] mx-auto bg-gray-100 h-[800px] rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden flex flex-col relative font-sans">
      
      {/* 1. Status Bar */}
      <div className="absolute top-0 w-full z-30 h-10 flex items-end justify-between px-6 pb-2 text-white drop-shadow-md mix-blend-difference">
        <span className="text-xs font-semibold">12:30</span>
        <div className="flex space-x-1.5 items-center">
            <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[8px]">5G</div>
            <div className="w-5 h-2.5 bg-white rounded-[2px] border border-white/50 relative">
              <div className="absolute inset-0 bg-white w-[80%]"></div>
            </div>
        </div>
      </div>

      {/* 2. Top Navigation (Transparent floating) */}
      <div className="absolute top-10 w-full z-20 px-4 flex justify-between items-center text-white drop-shadow-lg">
         <div className="w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors">
           <ChevronLeft size={20} />
         </div>
         <div className="flex gap-3">
            <div className="w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors">
              <Share2 size={18} />
            </div>
            <div className="w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors">
              <MoreHorizontal size={18} />
            </div>
         </div>
      </div>

      {/* 3. Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 bg-gray-100">
        
        {/* A. Hero Carousel (Using GENERATED Hero Images) */}
        <div className="relative w-full aspect-square bg-gray-200 group">
           {analysis.heroImages.length > 0 ? (
             <>
               <div 
                ref={scrollContainerRef}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
                onScroll={handleScroll}
               >
                 {analysis.heroImages.map((heroImg) => (
                   <div key={heroImg.id} className="w-full h-full flex-shrink-0 snap-center relative bg-white">
                      
                      {/* Logic: If video exists, show video. Else show Image. Else show placeholder. */}
                      {heroImg.generatedVideoUrl ? (
                         <div className="w-full h-full relative">
                           <video 
                              src={heroImg.generatedVideoUrl} 
                              className="w-full h-full object-cover" 
                              autoPlay 
                              muted 
                              loop 
                              playsInline 
                           />
                           {/* Icon to indicate video */}
                           <div className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full backdrop-blur-sm">
                              <Play size={12} fill="currentColor" />
                           </div>
                         </div>
                      ) : heroImg.generatedImageUrl ? (
                         <div className="w-full h-full relative">
                           <img 
                             src={heroImg.generatedImageUrl} 
                             className="w-full h-full object-cover" 
                             alt={heroImg.title} 
                           />
                           {heroImg.videoStatus === 'generating' && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                 <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold text-indigo-600 shadow-xl">
                                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    Generating Video...
                                 </div>
                              </div>
                           )}
                         </div>
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-8 text-center">
                            {heroImg.status === 'generating' ? (
                               <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            ) : (
                               <div className="w-16 h-16 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
                                  <Wand2 size={24} className="opacity-50"/>
                               </div>
                            )}
                            <h4 className="text-sm font-bold text-gray-800 mb-1">{t.heroTypes[heroImg.type]}</h4>
                            <p className="text-xs max-w-[200px]">{t.planningDesc}</p>
                         </div>
                      )}
                      
                      {/* Badge for Image Type */}
                      <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded">
                         {t.heroTypes[heroImg.type]}
                      </div>
                   </div>
                 ))}
               </div>
               
               {/* Carousel Controls */}
               <button 
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
               >
                  <ChevronLeft size={16} />
               </button>
               <button 
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10 hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
               >
                  <ChevronRight size={16} />
               </button>

               <div className="absolute bottom-4 right-4 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm z-10 font-medium tabular-nums">
                 {activeSlide + 1} / {analysis.heroImages.length}
               </div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-400">Initializing...</div>
           )}
        </div>

        {/* B. Flash Sale Price Block */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg relative z-10 -mt-2 rounded-t-xl">
           <div className="flex items-baseline gap-1">
             <span className="text-sm">¥</span>
             <span className="text-2xl font-bold">{analysis.priceEstimate || '99'}</span>
             <span className="text-xs line-through opacity-70 ml-2">¥{Number(analysis.priceEstimate || 99) * 2}</span>
           </div>
           <div className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
             {t.flashSale}
           </div>
        </div>

        {/* C. Title & Tags Info */}
        <div className="bg-white p-4 mb-2">
           <h1 className="text-gray-900 font-bold text-lg leading-snug mb-3">
             <span className="inline-block bg-orange-100 text-orange-600 text-[10px] px-1 rounded mr-2 align-middle">{t.flashSale}</span>
             {analysis.refinedTitle}
           </h1>
           
           <div className="flex flex-wrap gap-2 mb-3">
             {analysis.refinedSellingPoints.slice(0,3).map((usp, i) => (
               <div key={i} className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center">
                  {usp} <ChevronRight size={10} className="ml-0.5 opacity-50"/>
               </div>
             ))}
           </div>
        </div>

        {/* G. "Detail" Header - Separator */}
        <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-xs bg-gray-100">
           <span className="h-[1px] w-8 bg-gray-300"></span>
           <span className="uppercase tracking-widest">{t.detailHeader}</span>
           <span className="h-[1px] w-8 bg-gray-300"></span>
        </div>

        {/* H. The Generated Content (The "Long Image" Slices) */}
        <div className="bg-white pb-6 min-h-[400px]">
           {analysis.sections.length > 0 ? (
             analysis.sections.map(renderSection)
           ) : (
             <div className="p-8 text-center text-gray-400 text-sm">
               Generations will appear here...
             </div>
           )}
        </div>

        {/* I. Bottom Recommendation */}
        <div className="p-4 text-center">
           <p className="text-xs text-gray-400">- THE END -</p>
        </div>

      </div>

      {/* 4. Bottom Tab Bar (Sticky) */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-3 py-2 pb-6 z-40 flex items-center gap-2">
         {/* Icons */}
         <div className="flex gap-4 px-2">
            <div className="flex flex-col items-center gap-0.5">
               <Store size={18} className="text-gray-600" />
               <span className="text-[10px] text-gray-500">{t.shop}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
               <MessageCircle size={18} className="text-gray-600" />
               <span className="text-[10px] text-gray-500">{t.chat}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 relative">
               <ShoppingBag size={18} className="text-gray-600" />
               <span className="text-[10px] text-gray-500">Cart</span>
            </div>
         </div>

         {/* Buttons */}
         <div className="flex-1 flex rounded-full overflow-hidden ml-2">
            <button className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-bold py-2.5 flex flex-col items-center justify-center leading-none">
               <span>{t.addToCart}</span>
            </button>
            <button className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold py-2.5 flex flex-col items-center justify-center leading-none">
               <span>{t.buyNow}</span>
               <span className="text-[10px] font-normal opacity-80 mt-0.5">Coupon: ¥10</span>
            </button>
         </div>
      </div>

    </div>
  );
};

export default Preview;
