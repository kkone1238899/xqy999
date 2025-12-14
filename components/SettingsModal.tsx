
import React, { useState, useEffect } from 'react';
import { X, Globe, Save, Video, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { translations } from '../constants/translations';
import { loadSettings, saveSettings } from '../services/storageService';
import { testGoogleApiKey } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'zh' | 'en';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [proxyUrl, setProxyUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [videoProvider, setVideoProvider] = useState<'google' | 'grok'>('google');
  const [grokApiKey, setGrokApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const settings = loadSettings();
      setProxyUrl(settings.proxyUrl || '');
      setGoogleApiKey(settings.googleApiKey || '');
      setVideoProvider(settings.videoProvider || 'google');
      setGrokApiKey(settings.grokApiKey || '');
      setTestStatus('idle');
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings({ 
      proxyUrl: proxyUrl.trim(),
      googleApiKey: googleApiKey.trim(),
      videoProvider,
      grokApiKey: grokApiKey.trim()
    });
    onClose();
  };

  const handleTestKey = async () => {
    if (!googleApiKey.trim()) return;
    setTestStatus('testing');
    try {
        await testGoogleApiKey(googleApiKey.trim(), proxyUrl.trim());
        setTestStatus('success');
        // Clear success message after 3 seconds
        setTimeout(() => setTestStatus('idle'), 3000);
    } catch (e) {
        console.error(e);
        setTestStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{t.settingsTitle}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* 0. Google API Key Section */}
          <div className="space-y-3 pb-6 border-b border-gray-100">
             <div className="flex items-center gap-2 text-green-600 font-bold text-sm uppercase tracking-wider">
                <Key size={16} /> {t.apiKeyManagement}
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.googleApiKeyLabel}</label>
                <div className="flex gap-2">
                    <input 
                       type="password"
                       value={googleApiKey}
                       onChange={(e) => {
                           setGoogleApiKey(e.target.value);
                           setTestStatus('idle');
                       }}
                       placeholder={t.googleApiKeyPlaceholder}
                       className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <button 
                        onClick={handleTestKey}
                        disabled={testStatus === 'testing' || !googleApiKey}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1
                            ${testStatus === 'success' ? 'bg-green-500 text-white' : 
                              testStatus === 'error' ? 'bg-red-500 text-white' :
                              'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                        `}
                    >
                        {testStatus === 'testing' && <Loader2 size={12} className="animate-spin" />}
                        {testStatus === 'success' && <CheckCircle size={12} />}
                        {testStatus === 'error' && <AlertCircle size={12} />}
                        
                        {testStatus === 'testing' ? t.testing :
                         testStatus === 'success' ? t.testSuccess :
                         testStatus === 'error' ? t.testFailed :
                         t.testKey
                        }
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">{t.apiKeyHelp}</p>
             </div>
          </div>

          {/* 1. Proxy Section */}
          <div className="space-y-3 pb-6 border-b border-gray-100">
             <div className="flex items-center gap-2 text-orange-600 font-bold text-sm uppercase tracking-wider">
                <Globe size={16} /> {t.proxySettings}
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.proxyUrlLabel}</label>
                <input 
                   type="text"
                   value={proxyUrl}
                   onChange={(e) => setProxyUrl(e.target.value)}
                   placeholder={t.proxyPlaceholder}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">{t.proxyHelp}</p>
             </div>
          </div>

          {/* 2. Video Settings Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider">
                <Video size={16} /> {t.videoSettings}
             </div>
             
             {/* Provider Select */}
             <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.videoProviderLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVideoProvider('google')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                      videoProvider === 'google' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.videoProviderGoogle}
                  </button>
                  <button
                    onClick={() => setVideoProvider('grok')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                      videoProvider === 'grok' 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.videoProviderGrok}
                  </button>
                </div>
             </div>

             {/* Grok API Key Input (Conditional) */}
             {videoProvider === 'grok' && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t.grokApiKeyLabel}</label>
                  <input 
                     type="password"
                     value={grokApiKey}
                     onChange={(e) => setGrokApiKey(e.target.value)}
                     placeholder={t.grokApiKeyPlaceholder}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
             )}

          </div>

        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
           >
             {t.close}
           </button>
           <button 
             onClick={handleSave}
             className="px-4 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-lg shadow-lg flex items-center gap-2 transition-colors"
           >
             <Save size={14} /> {t.saveSettings}
           </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
