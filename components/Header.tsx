import React from 'react';
import { Building2 } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between py-6 px-8 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/20">
          <Building2 className="w-6 h-6 text-gold-500" />
        </div>
        <div>
          <h1 className="text-xl font-serif font-medium text-slate-100 tracking-wide">PELUMI <span className="text-gold-500">AI</span></h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Est. 2025 • Premium Realty</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-light">
        <span className="hover:text-gold-400 cursor-pointer transition-colors">Buying</span>
        <span className="hover:text-gold-400 cursor-pointer transition-colors">Selling</span>
        <span className="hover:text-gold-400 cursor-pointer transition-colors">Consultation</span>
      </div>
    </header>
  );
};

export default Header;