import React, { memo } from 'react';
import { HardHat, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User, UserRole } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  showAdminPanel: boolean;
  onToggleAdmin: () => void;
  onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = memo(({ currentUser, onLogout, showAdminPanel, onToggleAdmin, onToggleMenu }) => {
  return (
    <header className="bg-[#1C448E] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            onClick={onToggleMenu}
            className="relative flex items-center justify-center w-12 h-12 overflow-hidden rounded-xl bg-[#0084CA] shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-white/20 group cursor-pointer"
          >
            <span className="text-4xl text-white select-none transition-transform group-hover:scale-110" style={{ fontFamily: "'Pirata One', cursive" }}>
              B
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="flex items-center gap-4 border-l border-blue-800 pl-4">
              <div className="hidden lg:flex flex-col items-end">
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