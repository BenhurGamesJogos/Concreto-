import React from 'react';
import { 
  Calculator, 
  Dumbbell, 
  BarChart, 
  X, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon,
  ChevronRight,
  MoveHorizontal,
  LayoutGrid
} from 'lucide-react';
import { User, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'dosage' | 'strength' | 'granulometry' | 'beam' | 'frame';
  setActiveTab: (tab: 'dosage' | 'strength' | 'granulometry' | 'beam' | 'frame') => void;
  currentUser: User | null;
  onLogout: () => void;
  showAdminPanel: boolean;
  onToggleAdmin: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  showAdminPanel,
  onToggleAdmin
}) => {
  const menuItems = [
    { id: 'dosage', label: 'Cálculo de Dosagem', icon: Calculator },
    { id: 'strength', label: 'Estimativa de Resistência', icon: Dumbbell },
    { id: 'granulometry', label: 'Granulometria', icon: BarChart },
    { id: 'beam', label: 'Análise de Vigas', icon: MoveHorizontal },
    { id: 'frame', label: 'Análise de Pórticos', icon: LayoutGrid },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            key="sidebar-content"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl z-[9999] flex flex-col border-r border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-[#1C448E] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden rounded-xl bg-[#0084CA] shadow-lg border border-white/20">
                  <span className="text-3xl text-white select-none" style={{ fontFamily: "'Pirata One', cursive" }}>
                    B
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight leading-none">Ben-Hur</h2>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Concreto</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-3 -mr-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white active:scale-90"
                aria-label="Fechar menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* User Info */}
            {currentUser && (
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#1C448E]/10 flex items-center justify-center text-[#1C448E]">
                    {currentUser.role === UserRole.ADMIN ? (
                      <ShieldCheck size={24} />
                    ) : (
                      <UserIcon size={24} />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-black text-slate-800 truncate uppercase tracking-tight">{currentUser.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Acesso Normal'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Menu Principal</p>
              
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(item.id as any);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${
                    activeTab === item.id && !showAdminPanel
                      ? 'bg-[#1C448E] text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-colors ${
                    activeTab === item.id && !showAdminPanel
                      ? 'bg-white/10'
                      : 'bg-slate-100 group-hover:bg-white'
                  }`}>
                    <item.icon size={20} />
                  </div>
                  <span className="flex-grow text-left font-bold text-sm">{item.label}</span>
                  <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    activeTab === item.id && !showAdminPanel ? 'text-white/40' : 'text-slate-300'
                  }`} />
                </button>
              ))}

              {currentUser?.role === UserRole.ADMIN && (
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Administração</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAdmin();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${
                      showAdminPanel
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${
                      showAdminPanel
                        ? 'bg-white/10'
                        : 'bg-slate-100 group-hover:bg-white'
                    }`}>
                      <ShieldCheck size={20} />
                    </div>
                    <span className="flex-grow text-left font-bold text-sm">Gerenciar Usuários</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
              >
                <div className="p-2 bg-red-100 rounded-xl">
                  <LogOut size={20} />
                </div>
                Sair da Conta
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
