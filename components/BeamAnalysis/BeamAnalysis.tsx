import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Settings2, Info, ArrowDown, ArrowUp, MoveHorizontal, RotateCcw, RotateCw, GripHorizontal } from 'lucide-react';
import { BeamData, BeamLoad, BeamSupport, LoadType, SupportType } from '../../types';
import { analyzeBeam } from '../../utils/beamCalculator';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const BeamAnalysis: React.FC = () => {
  const beamRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [beam, setBeam] = useState<BeamData>({
    length: 5,
    supports: [],
    loads: []
  });

  const [editingElement, setEditingElement] = useState<{ type: 'load' | 'support', id: string } | null>(null);

  const analysis = useMemo(() => analyzeBeam(beam), [beam]);

  const calculatePosition = (clientX: number) => {
    if (!beamRef.current) return 0;
    const rect = beamRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = (x / rect.width) * beam.length;
    return Math.min(beam.length, Math.max(0, parseFloat(pos.toFixed(2))));
  };

  const addLoad = (type: LoadType, position?: number) => {
    const newLoad: BeamLoad = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: position ?? beam.length / 2,
      value: 10,
      ...(type === LoadType.DISTRIBUTED ? { endPosition: Math.min(beam.length, (position ?? beam.length / 2) + 1), endValue: 10 } : {})
    };
    setBeam(prev => ({ ...prev, loads: [...prev.loads, newLoad] }));
  };

  const addSupport = (type: SupportType, position?: number) => {
    const newSupport: BeamSupport = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      position: position ?? beam.length / 2
    };
    setBeam(prev => ({ ...prev, supports: [...prev.supports, newSupport] }));
  };

  const removeLoad = (id: string) => {
    setBeam(prev => ({ ...prev, loads: prev.loads.filter(l => l.id !== id) }));
  };

  const removeSupport = (id: string) => {
    setBeam(prev => ({ ...prev, supports: prev.supports.filter(s => s.id !== id) }));
  };

  const updateLoad = (id: string, updates: Partial<BeamLoad>) => {
    setBeam(prev => ({
      ...prev,
      loads: prev.loads.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const updateSupport = (id: string, updates: Partial<BeamSupport>) => {
    setBeam(prev => ({
      ...prev,
      supports: prev.supports.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  return (
    <div className="space-y-8">
      {/* Beam Visualizer & Editor */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#1C448E] flex items-center gap-2 uppercase tracking-tight">
              Configuração da Viga
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Defina o comprimento, apoios e cargas</p>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setBeam({ length: 5, supports: [], loads: [] })}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Limpar Tudo"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Toolbox */}
          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Apoios (Arraste)</p>
                <div className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {[SupportType.PINNED, SupportType.ROLLER, SupportType.FIXED, SupportType.HINGE].map(type => (
                    <motion.button
                      key={type}
                      drag
                      dragSnapToOrigin
                      whileDrag={{ scale: 1.2, zIndex: 100 }}
                      onDragEnd={(e, info) => {
                        const isClick = Math.abs(info.offset.x) < 15 && Math.abs(info.offset.y) < 15;
                        
                        if (isClick) {
                          addSupport(type);
                          return;
                        }

                        if (dropZoneRef.current && beamRef.current) {
                          const rect = dropZoneRef.current.getBoundingClientRect();
                          // Extremely generous tolerance for mobile/touch, especially downwards for supports
                          const isInside = 
                            info.point.y >= rect.top - 150 && 
                            info.point.y <= rect.bottom + 250;

                          if (isInside) {
                            const pos = calculatePosition(info.point.x);
                            addSupport(type, pos);
                          }
                        }
                      }}
                      className="w-12 h-12 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-[#0084CA] cursor-grab active:cursor-grabbing relative group flex items-center justify-center touch-none"
                      title={`Arraste ou clique para adicionar Apoio ${type === SupportType.PINNED ? 'Fixo' : type === SupportType.ROLLER ? 'Móvel' : type === SupportType.FIXED ? 'Engaste' : 'Rótula'}`}
                    >
                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={8} className="text-slate-400" />
                      </div>
                      {type === SupportType.PINNED && <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-current"></div>}
                      {type === SupportType.ROLLER && <div className="flex flex-col items-center"><div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-current"></div><div className="w-3 h-0.5 bg-slate-300 mt-0.5"></div></div>}
                      {type === SupportType.FIXED && <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>}
                      {type === SupportType.HINGE && <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white"></div>}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargas (Arraste)</p>
                <div className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {[LoadType.CONCENTRATED, LoadType.DISTRIBUTED, LoadType.MOMENT].map(type => (
                    <motion.button
                      key={type}
                      drag
                      dragSnapToOrigin
                      whileDrag={{ scale: 1.2, zIndex: 100 }}
                      onDragEnd={(e, info) => {
                        const isClick = Math.abs(info.offset.x) < 15 && Math.abs(info.offset.y) < 15;
                        
                        if (isClick) {
                          addLoad(type);
                          return;
                        }

                        if (dropZoneRef.current && beamRef.current) {
                          const rect = dropZoneRef.current.getBoundingClientRect();
                          // Generous tolerance for mobile/touch
                          const isInside = 
                            info.point.y >= rect.top - 150 && 
                            info.point.y <= rect.bottom + 150;

                          if (isInside) {
                            const pos = calculatePosition(info.point.x);
                            addLoad(type, pos);
                          }
                        }
                      }}
                      className="w-12 h-12 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-[#1C448E] cursor-grab active:cursor-grabbing relative group flex items-center justify-center touch-none"
                      title={`Arraste ou clique para adicionar Carga ${type === LoadType.CONCENTRATED ? 'Concentrada' : type === LoadType.DISTRIBUTED ? 'Distribuída' : 'Momento'}`}
                    >
                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={8} className="text-slate-400" />
                      </div>
                      {type === LoadType.CONCENTRATED && <ArrowDown size={20} />}
                      {type === LoadType.DISTRIBUTED && <MoveHorizontal size={20} />}
                      {type === LoadType.MOMENT && <RotateCw size={20} />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Dica: Arraste os ícones acima para a viga ou mova os elementos já existentes</p>
          </div>

          {/* Beam Canvas Area */}
          <div 
            ref={dropZoneRef}
            className="relative h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mb-8 flex items-center justify-center"
          >
            <div 
              ref={beamRef}
              className="relative w-4/5 h-4 bg-[#1C448E] shadow-lg rounded-sm"
            >
              {/* Length Indicator */}
              <div className="absolute -bottom-12 left-0 right-0 flex justify-between items-center pointer-events-none">
                <div className="h-4 w-px bg-slate-300"></div>
                <div className="flex-grow border-b border-dashed border-slate-300 mx-2 flex items-center justify-center">
                  <span className="bg-slate-50 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{beam.length}m</span>
                </div>
                <div className="h-4 w-px bg-slate-300"></div>
              </div>

              {/* Supports */}
              {beam.supports.map(s => (
                <motion.div 
                  key={s.id}
                  drag="x"
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(_, info) => {
                    const newPos = calculatePosition(info.point.x);
                    updateSupport(s.id, { position: newPos });
                  }}
                  onClick={() => setEditingElement({ type: 'support', id: s.id })}
                  className="absolute top-full flex flex-col items-center cursor-grab active:cursor-grabbing z-20 hover:scale-110 touch-none"
                  animate={{ 
                    left: `${(s.position / beam.length) * 100}%`,
                    x: '-50%'
                  }}
                >
                  {s.type === SupportType.HINGE ? (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white -mt-2 z-10 shadow-sm"></div>
                  ) : s.type === SupportType.FIXED ? (
                    <div className="w-1.5 h-12 bg-slate-800 -mt-6 rounded-full"></div>
                  ) : (
                    <>
                      <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-[#0084CA]"></div>
                      {s.type === SupportType.ROLLER && (
                        <div className="flex gap-0.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        </div>
                      )}
                      {s.type === SupportType.PINNED && (
                        <div className="w-4 h-1 bg-slate-400 mt-0.5 rounded-full"></div>
                      )}
                    </>
                  )}
                </motion.div>
              ))}

              {/* Loads */}
              {beam.loads.map(l => (
                <motion.div 
                  key={l.id}
                  drag="x"
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(_, info) => {
                    const newPos = calculatePosition(info.point.x);
                    if (l.type === LoadType.DISTRIBUTED) {
                      const span = (l.endPosition || l.position) - l.position;
                      const clampedPos = Math.min(beam.length - span, newPos);
                      updateLoad(l.id, { 
                        position: clampedPos, 
                        endPosition: clampedPos + span 
                      });
                    } else {
                      updateLoad(l.id, { position: newPos });
                    }
                  }}
                  onClick={() => setEditingElement({ type: 'load', id: l.id })}
                  className={`absolute bottom-full flex flex-col cursor-grab active:cursor-grabbing z-30 hover:scale-[1.02] ${l.type !== LoadType.DISTRIBUTED ? 'items-center' : ''} touch-none`}
                  animate={{ 
                    left: `${(l.position / beam.length) * 100}%`,
                    width: l.type === LoadType.DISTRIBUTED ? `${((l.endPosition! - l.position) / beam.length) * 100}%` : 'auto',
                    x: l.type !== LoadType.DISTRIBUTED ? '-50%' : 0
                  }}
                >
                  {l.type === LoadType.CONCENTRATED && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#1C448E] mb-1 whitespace-nowrap bg-white/80 px-1 rounded">{l.value}kN</span>
                      {l.value >= 0 ? (
                        <ArrowDown size={20} className="text-[#1C448E]" />
                      ) : (
                        <ArrowUp size={20} className="text-red-500" />
                      )}
                    </div>
                  )}
                  {l.type === LoadType.MOMENT && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-[#1C448E] mb-1 whitespace-nowrap bg-white/80 px-1 rounded">{l.value}kNm</span>
                      {l.value >= 0 ? (
                        <RotateCw size={20} className="text-[#1C448E]" />
                      ) : (
                        <RotateCcw size={20} className="text-red-500" />
                      )}
                    </div>
                  )}
                  {l.type === LoadType.DISTRIBUTED && (
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[9px] font-black text-[#0084CA] uppercase whitespace-nowrap bg-white/90 px-2 py-0.5 rounded-full shadow-sm border border-blue-100 mb-1">
                        {l.value === (l.endValue ?? l.value) ? `${l.value}kN/m` : `${l.value} → ${l.endValue}kN/m`}
                      </span>
                      <div 
                        className="w-full h-16 border-b-2 border-[#0084CA] bg-[#0084CA]/10 relative"
                        style={{ 
                          clipPath: `polygon(0% ${100 - (Math.abs(l.value) / Math.max(0.1, Math.max(Math.abs(l.value), Math.abs(l.endValue ?? l.value)))) * 100}%, 100% ${100 - (Math.abs(l.endValue ?? l.value) / Math.max(0.1, Math.max(Math.abs(l.value), Math.abs(l.endValue ?? l.value)))) * 100}%, 100% 100%, 0% 100%)`,
                          background: `linear-gradient(to bottom, transparent, rgba(0, 132, 202, 0.2))`,
                          transform: l.value < 0 ? 'rotateX(180deg) translateY(-100%)' : 'none'
                        }}
                      >
                        <div className="absolute inset-0 flex justify-around items-end pb-1 opacity-30">
                          {[...Array(Math.max(3, Math.floor(((l.endPosition! - l.position) / beam.length) * 20)))].map((_, i) => (
                            l.value >= 0 ? (
                              <ArrowDown key={i} size={12} className="text-[#0084CA]" />
                            ) : (
                              <ArrowUp key={i} size={12} className="text-red-400" />
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* General Settings */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Settings2 size={14} /> Propriedades da Viga
              </h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-8">
                <div className="flex-grow">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Comprimento Total (m)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={beam.length}
                      onChange={(e) => setBeam(prev => ({ ...prev, length: parseFloat(e.target.value) }))}
                      className="flex-grow accent-[#0084CA]"
                    />
                    <input 
                      type="number" 
                      value={beam.length}
                      onChange={(e) => setBeam(prev => ({ ...prev, length: Math.max(0.1, parseFloat(e.target.value) || 0) }))}
                      className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#0084CA] outline-none"
                    />
                  </div>
                </div>
                <div className="text-center px-6 border-l border-slate-200">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Elementos</p>
                  <p className="text-xl font-black text-[#1C448E]">{beam.supports.length + beam.loads.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingElement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingElement(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-[calc(100%-2rem)] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-black text-[#1C448E] uppercase tracking-tight">
                  Editar {editingElement.type === 'support' ? 'Apoio' : 'Carga'}
                </h3>
                <button 
                  onClick={() => setEditingElement(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="p-5 sm:p-8 space-y-6">
                {editingElement.type === 'support' ? (
                  <>
                    {(() => {
                      const s = beam.supports.find(sup => sup.id === editingElement.id);
                      if (!s) return null;
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Apoio</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[SupportType.PINNED, SupportType.ROLLER, SupportType.FIXED, SupportType.HINGE].map(t => (
                                <button
                                  key={t}
                                  onClick={() => updateSupport(s.id, { type: t })}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${s.type === t ? 'bg-[#0084CA] text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                  {t === SupportType.PINNED ? 'Fixo' : t === SupportType.ROLLER ? 'Móvel' : t === SupportType.FIXED ? 'Engaste' : 'Rótula'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Posição (m)</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={s.position}
                              onChange={(e) => updateSupport(s.id, { position: Math.min(beam.length, Math.max(0, parseFloat(e.target.value) || 0)) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#0084CA] outline-none"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {(() => {
                      const l = beam.loads.find(load => load.id === editingElement.id);
                      if (!l) return null;
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Posição Inicial (m)</label>
                              <input 
                                type="number"
                                step="0.1"
                                value={l.position}
                                onChange={(e) => updateLoad(l.id, { position: Math.min(beam.length, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#1C448E] outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor (kN{l.type === LoadType.DISTRIBUTED ? '/m' : l.type === LoadType.MOMENT ? 'm' : ''})</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number"
                                  value={l.value}
                                  onChange={(e) => updateLoad(l.id, { value: parseFloat(e.target.value) || 0 })}
                                  className="flex-grow min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#1C448E] outline-none"
                                />
                                <button
                                  onClick={() => updateLoad(l.id, { value: l.value * -1 })}
                                  className="px-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs"
                                  title="Alternar sinal"
                                >
                                  +/-
                                </button>
                              </div>
                            </div>
                          </div>
                          {l.type === LoadType.DISTRIBUTED && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Posição Final (m)</label>
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={l.endPosition}
                                  onChange={(e) => updateLoad(l.id, { endPosition: Math.min(beam.length, Math.max(l.position, parseFloat(e.target.value) || 0)) })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#1C448E] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor Final (kN/m)</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    value={l.endValue ?? l.value}
                                    onChange={(e) => updateLoad(l.id, { endValue: parseFloat(e.target.value) || 0 })}
                                    className="flex-grow min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#1C448E] outline-none"
                                  />
                                  <button
                                    onClick={() => updateLoad(l.id, { endValue: (l.endValue ?? l.value) * -1 })}
                                    className="px-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs"
                                    title="Alternar sinal"
                                  >
                                    +/-
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      if (editingElement.type === 'support') removeSupport(editingElement.id);
                      else removeLoad(editingElement.id);
                      setEditingElement(null);
                    }}
                    className="flex-grow py-3 bg-red-50 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                  <button 
                    onClick={() => setEditingElement(null)}
                    className="flex-grow py-3 bg-[#1C448E] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Diagrams */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Shear Force Diagram */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-black text-[#1C448E] uppercase tracking-widest flex items-center gap-2">
              Esforço Cortante (V)
              <span className="text-[10px] text-slate-400 lowercase font-normal">[kN]</span>
            </h3>
          </div>
          <div className="p-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  domain={[0, beam.length]} 
                  hide={false}
                  height={0}
                  tick={false}
                  axisLine={false}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const val = Number(payload[0].value);
                      const x = Number(payload[0].payload.x);
                      return (
                        <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">x = {x.toFixed(2)}m</p>
                          <p className="text-sm font-bold text-[#1C448E]">V = {val.toFixed(2)} kN</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  isAnimationActive={false}
                  type="linear" 
                  dataKey="shear" 
                  stroke="#1C448E" 
                  fill="#1C448E" 
                  fillOpacity={0.1} 
                  strokeWidth={2}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
                {analysis.zeroCrossings.shear.map((x, idx) => (
                  <ReferenceLine 
                    key={`zero-shear-${idx}`} 
                    x={x} 
                    stroke="#f97316" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      position: 'top', 
                      value: `V=0 em ${x.toFixed(2)}m`, 
                      fontSize: 10, 
                      fill: '#f97316', 
                      fontWeight: '900',
                      dy: -10
                    }} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between">
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">V máx</p>
              <p className="text-sm font-bold text-[#1C448E]">{analysis.maxShear.toFixed(2)} kN</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">V mín</p>
              <p className="text-sm font-bold text-red-500">{analysis.minShear.toFixed(2)} kN</p>
            </div>
          </div>
        </div>

        {/* Bending Moment Diagram */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-black text-[#1C448E] uppercase tracking-widest flex items-center gap-2">
              Momento Fletor (M)
              <span className="text-[10px] text-slate-400 lowercase font-normal">[kNm]</span>
            </h3>
          </div>
          <div className="p-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="x" 
                  type="number" 
                  domain={[0, beam.length]} 
                  hide={false}
                  height={0}
                  tick={false}
                  axisLine={false}
                />
                <YAxis hide domain={['auto', 'auto']} reversed />
                <Tooltip 
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const val = Number(payload[0].value);
                      const x = Number(payload[0].payload.x);
                      return (
                        <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-lg">
                          <p className="text-[10px] font-black text-slate-400 uppercase">x = {x.toFixed(2)}m</p>
                          <p className="text-sm font-bold text-[#0084CA]">M = {val.toFixed(2)} kNm</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  isAnimationActive={false}
                  type="linear" 
                  dataKey="moment" 
                  stroke="#0084CA" 
                  fill="#0084CA" 
                  fillOpacity={0.1} 
                  strokeWidth={2}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={2} />
                {analysis.zeroCrossings.shear.map((x, idx) => (
                  <ReferenceLine 
                    key={`zero-shear-on-moment-${idx}`} 
                    x={x} 
                    stroke="#f97316" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      position: 'top', 
                      value: `V=0 em ${x.toFixed(2)}m`, 
                      fontSize: 10, 
                      fill: '#f97316', 
                      fontWeight: '900',
                      dy: -10
                    }} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between">
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">M máx</p>
              <p className="text-sm font-bold text-[#0084CA]">{analysis.maxMoment.toFixed(2)} kNm</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">M mín</p>
              <p className="text-sm font-bold text-red-500">{analysis.minMoment.toFixed(2)} kNm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reactions Info */}
      <div className="bg-[#1C448E] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <RotateCcw size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-3">
            <Info size={24} className="text-[#0084CA]" /> Reações de Apoio
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {analysis.reactions.map((r, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Apoio em {r.position}m</p>
                <p className="text-2xl font-black">{r.value.toFixed(2)} <span className="text-xs font-bold opacity-60">kN</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeamAnalysis;
