import React from 'react';
import { Hammer, HardHat } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#1C448E] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#0084CA] p-2 rounded-lg text-white">
            <Hammer size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nada Concreto</h1>
            <p className="text-xs text-blue-200 font-medium">UFRN • Engenharia Civil</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-blue-100">
          <div className="hidden md:flex flex-col items-end">
            <span className="font-semibold text-white">Criado por Ben-Hur</span>
            <span className="text-xs">Procedimento de Dosagem</span>
          </div>
          <HardHat className="text-[#0084CA]" />
        </div>
      </div>
    </header>
  );
};

export default Header;