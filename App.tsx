import React, { useState } from 'react';
import { DesignState, DesignPlan } from './types';
import { generateDesignPlan, generateVisualDesign } from './services/geminiService';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<DesignState>({
    status: 'idle',
    plan: null,
    imageUrl: null,
    error: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setState({ status: 'planning', plan: null, imageUrl: null, error: null });

    try {
      // Step 1: Plan
      const plan = await generateDesignPlan(prompt);
      setState(prev => ({ ...prev, status: 'generating', plan }));

      // Step 2: Paint
      const imageUrl = await generateVisualDesign(plan.imageGenerationPrompt);
      setState(prev => ({ ...prev, status: 'completed', imageUrl }));

    } catch (error: any) {
      console.error(error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message || 'Something went wrong. Please try again.' 
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-semibold tracking-tight">CanvasAI <span className="text-slate-400 font-normal">Designer</span></h1>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500 border border-slate-200">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        {/* Intro */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Describe it. See it.</h2>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            Your personal AI Art Director. Describe a UI, a poster, or a website, and we'll plan the UX and generate the mockup.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-12 relative z-0">
          <div className="bg-white p-2 rounded-2xl shadow-xl shadow-indigo-100 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <textarea
              className="w-full p-4 text-lg bg-transparent border-none focus:ring-0 resize-none outline-none min-h-[120px] text-slate-700 placeholder:text-slate-300"
              placeholder="e.g., A minimalist landing page for a high-end coffee shop called 'Brew'. Use warm earth tones, large imagery, and clean serif typography..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={state.status === 'planning' || state.status === 'generating'}
            />
            <div className="flex justify-between items-center px-4 pb-2">
              <span className="text-xs text-slate-400 font-medium">Gemini 2.5 Flash + Image</span>
              <button
                type="submit"
                disabled={!prompt.trim() || state.status === 'planning' || state.status === 'generating'}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {state.status === 'planning' || state.status === 'generating' ? (
                  <>
                    <Spinner />
                    <span>Processing</span>
                  </>
                ) : (
                  'Generate Design'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Status Indicators */}
        {(state.status === 'planning' || state.status === 'generating') && (
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className={`flex items-center gap-2 ${state.status === 'planning' ? 'text-indigo-600 animate-pulse' : 'text-emerald-600'}`}>
                {state.status === 'planning' ? '●' : '✓'} Planning Layout
              </span>
              <span className="w-8 h-px bg-slate-300"></span>
              {/* Fixed: Removed unreachable 'completed' check since the parent condition ensures status is only 'planning' or 'generating' */}
              <span className={`flex items-center gap-2 ${state.status === 'generating' ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`}>
                {state.status === 'generating' ? '●' : '○'} Rendering Pixels
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.status === 'error' && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-8 text-center">
            {state.error}
          </div>
        )}

        {/* Results Area */}
        {state.plan && (
          <div className="animate-fade-in-up space-y-8">
            
            {/* The Blueprint Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  Design Blueprint
                </h3>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Step 1</span>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Strategy</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{state.plan.layoutStrategy}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Palette</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{state.plan.colorPalette}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Typography</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{state.plan.typographyStyle}</p>
                </div>
              </div>
            </div>

            {/* The Visual Result */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg shadow-slate-200/50">
               <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  Generated Mockup
                </h3>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Step 2</span>
              </div>
              
              <div className="min-h-[400px] flex items-center justify-center bg-slate-100 relative">
                {state.imageUrl ? (
                  <img 
                    src={state.imageUrl} 
                    alt="AI Generated Design" 
                    className="w-full h-auto object-cover animate-fade-in"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 animate-pulse">
                     <div className="w-12 h-12 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                     <p className="text-sm font-medium">Generating high-fidelity visual...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-8">
              <button 
                onClick={() => window.location.reload()}
                className="text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                Start a new design
              </button>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default App;