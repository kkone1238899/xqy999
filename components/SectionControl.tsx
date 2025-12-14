
import React, { useState } from 'react';
import { GeneratedSection, ReferenceImage } from '../types';
import { translations } from '../constants/translations';
import { Wand2, Edit2, Save, X, RefreshCw, Image as ImageIcon, Type, Trash2 } from 'lucide-react';

interface SectionControlProps {
  section: GeneratedSection;
  index: number;
  referenceImages: ReferenceImage[];
  lang: 'zh' | 'en';
  onUpdate: (id: string, updates: Partial<GeneratedSection>) => void;
  onGenerate: (id: string) => void;
  onDelete: (id: string) => void;
}

const SectionControl: React.FC<SectionControlProps> = ({
  section,
  index,
  referenceImages,
  lang,
  onUpdate,
  onGenerate,
  onDelete
}) => {
  const t = translations[lang];
  const [isExpanded, setIsExpanded] = useState(false);

  // Local state for editing form to avoid constant re-renders on parent
  const [editForm, setEditForm] = useState({
    title: section.title,
    overlayText: section.overlayText || '',
    content: section.content,
    imagePrompt: section.imagePrompt,
    referenceImageId: section.referenceImageId || ''
  });

  const handleSave = () => {
    onUpdate(section.id, {
      ...editForm,
      isEditing: false
    });
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setEditForm({
      title: section.title,
      overlayText: section.overlayText || '',
      content: section.content,
      imagePrompt: section.imagePrompt,
      referenceImageId: section.referenceImageId || ''
    });
    onUpdate(section.id, { isEditing: false });
    setIsExpanded(false);
  };

  const toggleEdit = () => {
    if (!isExpanded) {
      onUpdate(section.id, { isEditing: true });
      setIsExpanded(true);
    } else {
      handleCancel();
    }
  };

  const isGenerating = section.status === 'generating';
  const hasImage = !!section.generatedImageUrl;
  const isTextOnly = section.type === 'specs_size' || section.type === 'trust_endorsement';

  return (
    <div className={`border rounded-xl transition-all duration-300 ${
      isExpanded ? 'bg-white border-orange-200 shadow-lg ring-1 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'
    }`}>
      {/* Header / Summary View */}
      <div className="p-4 flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
            {index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-gray-900 truncate pr-2">{section.title}</h4>
            <div className="flex items-center gap-1">
               <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                 section.status === 'completed' ? 'bg-green-100 text-green-700' : 
                 section.status === 'failed' ? 'bg-red-100 text-red-700' :
                 'bg-gray-100 text-gray-500'
               }`}>
                 {section.status === 'completed' ? 'Ready' : section.status}
               </span>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            {t.moduleTypes[section.type]}
          </p>

          {!isExpanded && (
            <div className="flex items-center gap-2 mt-2">
              <button 
                onClick={toggleEdit}
                className="text-xs flex items-center gap-1 px-2 py-1.5 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium transition-colors"
              >
                <Edit2 size={12} /> {t.edit}
              </button>

              {!isTextOnly && (
                <button 
                  onClick={() => onGenerate(section.id)}
                  disabled={isGenerating}
                  className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded text-white font-medium transition-colors shadow-sm
                    ${isGenerating ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'}
                  `}
                >
                  {isGenerating ? <RefreshCw size={12} className="animate-spin"/> : <Wand2 size={12} />}
                  {hasImage ? t.regenerate : t.generate}
                </button>
              )}
            </div>
          )}
        </div>

        {hasImage && !isExpanded && (
          <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50">
            <img src={section.generatedImageUrl} alt="Generated" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Expanded Editor */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-4">
          
          {/* 1. Content Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t.sectionTitle}</label>
              <input 
                type="text" 
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {!isTextOnly && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{t.overlayText}</label>
                <input 
                  type="text" 
                  value={editForm.overlayText}
                  onChange={(e) => setEditForm({...editForm, overlayText: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Short punchy text on image"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{t.contentCopy}</label>
              <textarea 
                rows={3}
                value={editForm.content}
                onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* 2. Image Generation Settings */}
          {!isTextOnly && (
            <div className="bg-orange-50 p-3 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-orange-800 text-xs font-bold uppercase tracking-wider">
                <ImageIcon size={12} /> {t.imageGenSettings}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.referenceImage}</label>
                <select 
                  value={editForm.referenceImageId}
                  onChange={(e) => setEditForm({...editForm, referenceImageId: e.target.value})}
                  className="w-full text-xs border border-orange-200 rounded-lg px-2 py-2 bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {referenceImages.map(img => (
                    <option key={img.id} value={img.id}>
                      {t.labels[img.label]} (ID: ...{img.id.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t.aiPrompt} (English)</label>
                <textarea 
                  rows={3}
                  value={editForm.imagePrompt}
                  onChange={(e) => setEditForm({...editForm, imagePrompt: e.target.value})}
                  className="w-full text-xs border border-orange-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-orange-500 outline-none resize-none font-mono text-gray-600"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button 
              onClick={() => onDelete(section.id)}
              className="text-gray-400 hover:text-red-500 p-2 rounded transition-colors"
              title="Delete Section"
            >
              <Trash2 size={16} />
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gray-900 hover:bg-black transition-colors flex items-center gap-1"
              >
                <Save size={12} /> {t.save}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default SectionControl;
