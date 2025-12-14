
import React, { useState, useRef } from 'react';
import { ProductInput, ReferenceImage, ImageLabel } from '../types';
import { Upload, Loader2, Sparkles, X, Plus } from 'lucide-react';
import { translations } from '../constants/translations';

interface InputStepProps {
  onStart: (data: ProductInput) => void;
  isProcessing: boolean;
  lang: 'zh' | 'en';
}

const InputStep: React.FC<InputStepProps> = ({ onStart, isProcessing, lang }) => {
  const [name, setName] = useState('');
  const [features, setFeatures] = useState('');
  const [audience, setAudience] = useState('');
  
  // New Image State
  const [images, setImages] = useState<ReferenceImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = translations[lang];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        // Basic check for image type
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          const newImage: ReferenceImage = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            base64: base64String,
            mimeType: file.type,
            label: images.length === 0 ? 'main' : 'detail' // Default first to main, others to detail
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleLabelChange = (id: string, newLabel: ImageLabel) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, label: newLabel } : img));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return;
    onStart({
      referenceImages: images,
      name,
      features,
      targetAudience: audience
    });
  };

  const labelOptions: ImageLabel[] = ['main', 'detail', 'texture', 'usage', 'other'];

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
          <Sparkles size={20} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t.createPageTitle}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Multi-Image Upload Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold text-gray-900">{t.productImageLabel}</label>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{images.length} uploaded</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative group border border-gray-200 rounded-xl overflow-hidden bg-gray-50 aspect-square">
                <img 
                  src={`data:${img.mimeType};base64,${img.base64}`} 
                  alt={img.label} 
                  className="w-full h-full object-cover"
                />
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                >
                  <X size={14} />
                </button>

                {/* Label Selector Overlay */}
                <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-sm p-1.5 border-t border-gray-100">
                  <select
                    value={img.label}
                    onChange={(e) => handleLabelChange(img.id, e.target.value as ImageLabel)}
                    className="w-full text-[10px] font-medium bg-transparent border-none outline-none text-gray-800 p-0 focus:ring-0 cursor-pointer"
                  >
                    {labelOptions.map(opt => (
                      <option key={opt} value={opt}>{t.labels[opt]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            {/* Upload Button */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl aspect-square cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <div className="p-3 bg-gray-100 rounded-full text-gray-500 mb-2">
                <Plus size={20} />
              </div>
              <span className="text-xs font-bold text-gray-600">{t.addImage}</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-400">{t.imageLimits}</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            multiple
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>

        {/* Text Inputs */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">{t.productNameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder={t.productNamePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {t.featuresLabel}
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium resize-none"
              placeholder={t.featuresPlaceholder}
            />
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
               <Sparkles size={12} className="text-orange-500"/> {t.featuresHelp}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              {t.audienceLabel}
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-medium"
              placeholder={t.audiencePlaceholder}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={images.length === 0 || isProcessing}
          className={`w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg shadow-xl shadow-orange-500/20 transition-all transform
            ${(images.length === 0 || isProcessing) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:scale-[1.01] hover:shadow-orange-500/30'}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              {t.analyzingBtn}
            </>
          ) : (
            t.generateBtn
          )}
        </button>
      </form>
    </div>
  );
};

export default InputStep;
