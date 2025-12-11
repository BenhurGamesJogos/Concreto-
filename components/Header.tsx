import React from 'react';
import { Hammer, HardHat } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500 p-2 rounded-lg text-slate-900">
            <Hammer size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nada Concreto</h1>
            <p className="text-xs text-slate-400 font-medium">UFRN • Engenharia Civil</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div className="hidden md:flex flex-col items-end">
            <span className="font-semibold text-white">Criado por Ben-Hur</span>
            <span className="text-xs">Procedimento de Dosagem</span>
          </div>
          <HardHat className="text-yellow-500" />
        </div>
      </div>
    </header>
  );
};

export default Header;