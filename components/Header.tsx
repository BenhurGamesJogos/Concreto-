import React, { memo } from 'react';
import { Hammer, HardHat, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  showAdminPanel: boolean;
  onToggleAdmin: () => void;
}

const Header: React.FC<HeaderProps> = memo(({ currentUser, onLogout, showAdminPanel, onToggleAdmin }) => {
  return (
    <header className="bg-[#1C448E] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#0084CA] p-2 rounded-lg text-white">
            <Hammer size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ben-Hur Concreto</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="flex items-center gap-4 border-l border-blue-800 pl-4">
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  {currentUser.role === UserRole.ADMIN ? (
                    <ShieldCheck size={14} className="text-yellow-400" />
                  ) : (
                    <UserIcon size={14} className="text-blue-300" />
                  )}
                  {currentUser.name}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold">
                  {currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Acesso Normal'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {currentUser.role === UserRole.ADMIN && (
                  <button
                    onClick={onToggleAdmin}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      showAdminPanel 
                        ? 'bg-yellow-500 text-blue-900 shadow-inner' 
                        : 'bg-blue-700 text-white hover:bg-blue-600'
                    }`}
                  >
                    {showAdminPanel ? 'Voltar p/ Calculadora' : 'Gerenciar Usuários'}
                  </button>
                )}
                
                <button 
                  onClick={onLogout}
                  className="p-2 hover:bg-red-600 rounded-lg transition-colors text-white group"
                  title="Sair"
                >
                  <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          )}
          {!currentUser && <HardHat className="text-[#0084CA]" />}
        </div>
      </div>
    </header>
  );
});

export default Header;