import React from 'react';
import Header from './components/Header';
import LiveAgent from './components/LiveAgent';
import { PACKAGES } from './constants';
import { Check } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-gold-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Context & Packages (Static Info) */}
          <div className="lg:col-span-4 space-y-8">
             <div className="prose prose-invert prose-slate">
                <h2 className="text-3xl font-serif font-light text-slate-100 leading-tight">
                  Experience the <span className="text-gold-500 italic">future</span> of real estate.
                </h2>
                <p className="text-slate-400">
                  Pelumi AI offers bespoke consultation for discerning clients. Connect instantly to discuss property acquisition or sales strategies.
                </p>
             </div>

             <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Signature Packages
                </h3>
                {PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="group p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-gold-500/30 transition-all duration-300">
                    <div className="flex justify-between items-baseline mb-2">
                      <h4 className="font-medium text-slate-200 group-hover:text-gold-400 transition-colors">{pkg.name}</h4>
                    </div>
                    <p className="text-sm text-gold-600 font-medium mb-3">{pkg.price}</p>
                    <ul className="space-y-2">
                      {pkg.features.slice(0, 3).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                           <Check className="w-3 h-3 text-slate-600 group-hover:text-gold-500 transition-colors" />
                           {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
             </div>
          </div>

          {/* Right Column: Live Agent Interface */}
          <div className="lg:col-span-8 h-[600px] lg:h-[700px]">
            <LiveAgent />
          </div>

        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-900 mt-12 py-8 text-center text-slate-600 text-sm">
        <p>© 2025 Pelumi AI Realty Group. Powered by Gemini 2.5 Flash Native Audio.</p>
      </footer>
    </div>
  );
}