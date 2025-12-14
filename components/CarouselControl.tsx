
import React, { useState } from 'react';
import { HeroImage, ReferenceImage } from '../types';
import { translations } from '../constants/translations';
import { Wand2, Edit2, Save, RefreshCw, Image as ImageIcon, Check, Video, Film } from 'lucide-react';

interface CarouselControlProps {
  heroImage: HeroImage;
  index: number;
  referenceImages: ReferenceImage[];
  lang: 'zh' | 'en';
  onUpdate: (id: string, updates: Partial<HeroImage>) => void;
  onGenerate: (id: string) => void;
  onGenerateVideo?: (id: string) => void; // Optional for now to keep interface clean
}

const CarouselControl: React.FC<CarouselControlProps> = ({
  heroImage,
  index,
  referenceImages,
  lang,
  onUpdate,
  onGenerate,
  onGenerateVideo
}) => {
  const t = translations[lang];
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Toggle between Image Edit Mode and Video Edit Mode inside expanded view
  const [editMode, setEditMode] = useState<'image' | 'video'>('image');

  const [editForm, setEditForm] = useState({
    imagePrompt: heroImage.imagePrompt,
    videoPrompt: heroImage.videoPrompt || getDefaultVideoPrompt(heroImage.type),
    referenceImageId: heroImage.referenceImageId || ''
  });

  function getDefaultVideoPrompt(type: string) {
     switch(type) {
        case 'front_80': return "Slow pan camera showing the full product, clean white background, 4k quality.";
        case 'detail_zoom': return "Slow zoom in to show the fabric texture and material details, macro shot.";
        case 'scenario_life': return "Cinematic lifestyle shot, natural movement, soft lighting.";
        default: return "Slow cinematic movement showcasing the product.";
     }
  }

  const handleSave = () => {
    onUpdate(heroImage.id, { ...editForm, isEditing: false });
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setEditForm({
      imagePrompt: heroImage.imagePrompt,
      videoPrompt: heroImage.videoPrompt || getDefaultVideoPrompt(heroImage.type),
      referenceImageId: heroImage.referenceImageId || ''
    });
    onUpdate(heroImage.id, { isEditing: false });
    setIsExpanded(false);
  };

  const openVideoEdit = () => {
     setEditMode('video');
     setIsExpanded(true);
  };

  const openImageEdit = () => {
     setEditMode('image');
     setIsExpanded(true);
  };

  const isGenerating = heroImage.status === 'generating';
  const isGeneratingVideo = heroImage.videoStatus === 'generating';
  const hasImage = !!heroImage.generatedImageUrl;
  const hasVideo = !!heroImage.generatedVideoUrl;

  return (
    <div className={`bg-white border rounded-lg transition-all duration-300 ${
      isExpanded ? 'border-orange-200 shadow-md ring-1 ring-orange-100' : 'border-gray-100'
    }`}>
      {/* Collapsed View */}
      <div className="p-3 flex items-center justify-between">
         <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500 border border-gray-200 relative overflow-hidden">
               {hasImage ? (
                  <img src={heroImage.generatedImageUrl} alt="" className="w-full h-full object-cover rounded" />
               ) : (
                  <span>#{index + 1}</span>
               )}
               {hasVideo && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></div>}
            </div>
            <div className="min-w-0">
               <p className="text-xs font-bold text-gray-800 truncate">{t.heroTypes[heroImage.type]}</p>
               <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-500 truncate">{heroImage.status === 'completed' ? 'Image Ready' : heroImage.status}</p>
                  {hasVideo && <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1 rounded">Video Ready</span>}
               </div>
            </div>
         </div>

         <div className="flex items-center gap-1">
            {!isExpanded && (
               <>
                  <button onClick={openImageEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-50" title={t.edit}>
                     <Edit2 size={12} />
                  </button>
                  
                  {/* Generate Video Button - Only enabled if Image exists */}
                  <button 
                     onClick={openVideoEdit}
                     disabled={!hasImage || isGeneratingVideo}
                     className={`p-1.5 rounded transition-colors ${
                        !hasImage ? 'text-gray-300 cursor-not-allowed' : 
                        isGeneratingVideo ? 'bg-indigo-100 text-indigo-400' : 'text-indigo-500 hover:bg-indigo-50'
                     }`}
                     title={t.generateVideo}
                  >
                     {isGeneratingVideo ? <RefreshCw size={12} className="animate-spin"/> : <Video size={14} />}
                  </button>

                  <button 
                     onClick={() => onGenerate(heroImage.id)}
                     disabled={isGenerating}
                     className={`p-1.5 rounded text-white ${isGenerating ? 'bg-orange-300' : 'bg-orange-500 hover:bg-orange-600'}`}
                     title={t.generate}
                  >
                     {isGenerating ? <RefreshCw size={12} className="animate-spin"/> : <Wand2 size={12} />}
                  </button>
               </>
            )}
         </div>
      </div>

      {/* Expanded Edit View */}
      {isExpanded && (
         <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-3">
             
             {/* Tab Switcher */}
             <div className="flex gap-4 border-b border-gray-100 pb-2">
                <button 
                  onClick={() => setEditMode('image')}
                  className={`text-xs font-bold pb-1 ${editMode === 'image' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400'}`}
                >
                  Image Settings
                </button>
                <button 
                  onClick={() => setEditMode('video')}
                  disabled={!hasImage}
                  className={`text-xs font-bold pb-1 ${editMode === 'video' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400'} ${!hasImage && 'opacity-50 cursor-not-allowed'}`}
                >
                  Video Settings
                </button>
             </div>

             {editMode === 'image' ? (
               <div className="bg-orange-50 p-2 rounded-lg space-y-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-1 text-orange-800 text-[10px] font-bold uppercase">
                     <ImageIcon size={10} /> {t.imageGenSettings}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">{t.referenceImage}</label>
                    <select 
                      value={editForm.referenceImageId}
                      onChange={(e) => setEditForm({...editForm, referenceImageId: e.target.value})}
                      className="w-full text-[10px] border border-orange-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-orange-500 outline-none"
                    >
                      {referenceImages.map(img => (
                        <option key={img.id} value={img.id}>
                          {t.labels[img.label]} (ID: ...{img.id.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">{t.aiPrompt} (English)</label>
                    <textarea 
                      rows={3}
                      value={editForm.imagePrompt}
                      onChange={(e) => setEditForm({...editForm, imagePrompt: e.target.value})}
                      className="w-full text-[10px] border border-orange-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-orange-500 outline-none resize-none font-mono text-gray-600"
                    />
                  </div>
               </div>
             ) : (
               <div className="bg-indigo-50 p-2 rounded-lg space-y-2 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="flex items-center gap-1 text-indigo-800 text-[10px] font-bold uppercase">
                     <Film size={10} /> {t.videoGenSettings}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">{t.videoPrompt}</label>
                    <textarea 
                      rows={2}
                      value={editForm.videoPrompt}
                      onChange={(e) => setEditForm({...editForm, videoPrompt: e.target.value})}
                      className="w-full text-[10px] border border-indigo-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none font-mono text-gray-600"
                      placeholder="Describe the motion, e.g., Slow pan camera..."
                    />
                  </div>

                  <div className="flex justify-end">
                     <button 
                        onClick={() => {
                           handleSave(); // Save prompt first
                           if (onGenerateVideo) onGenerateVideo(heroImage.id);
                        }}
                        disabled={isGeneratingVideo}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm font-bold"
                     >
                        {isGeneratingVideo ? <RefreshCw size={10} className="animate-spin"/> : <Video size={10} />}
                        {t.generateVideo}
                     </button>
                  </div>
               </div>
             )}

             <div className="flex justify-end gap-2 border-t border-gray-100 pt-2">
                <button onClick={handleCancel} className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">{t.cancel}</button>
                <button onClick={handleSave} className="text-xs px-2 py-1 bg-gray-900 text-white rounded flex items-center gap-1 hover:bg-black">
                   <Check size={10} /> {t.save}
                </button>
             </div>
         </div>
      )}
    </div>
  );
};

export default CarouselControl;
