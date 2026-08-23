import React, { useState, useMemo } from 'react';
import { Scale, Droplets, ClipboardList, Dumbbell, Info, Calculator } from 'lucide-react';
import { CementClass, StandardDeviationControl } from '../types';
import { CEMENT_CONSTANTS } from '../constants';

const StrengthEstimator: React.FC = () => {
  const [sandRatio, setSandRatio] = useState<number>(2);
  const [gravelRatio, setGravelRatio] = useState<number>(3);
  const [wcRatio, setWcRatio] = useState<number>(0.5);
  const [cementClass, setCementClass] = useState<CementClass>(CementClass.CP_32);
  const [sdControl, setSdControl] = useState<StandardDeviationControl>(StandardDeviationControl.RAZOAVEL);
  const [autoWc, setAutoWc] = useState<boolean>(false);

  const results = useMemo(() => {
    let currentWc = wcRatio;
    let waterDemand = 0;
    let cementCons = 0;

    if (autoWc) {
      // Empirical water demand for ~60mm slump: H = 160 + 10*m1 + 5*m2
      waterDemand = 160 + (10 * sandRatio) + (5 * gravelRatio);
      
      // Volume equation: 1000 = C/3.1 + (m1*C)/2.63 + (m2*C)/2.65 + H
      const denom = (1 / 3.1) + (sandRatio / 2.63) + (gravelRatio / 2.65);
      cementCons = (1000 - waterDemand) / denom;
      currentWc = waterDemand / cementCons;
    }

    const { A, B } = CEMENT_CONSTANTS[cementClass];
    
    // Abrams Law (Inverse): w/c = A / (fc28 + B) => fc28 = (A / (w/c)) - B
    const fc28 = (A / currentWc) - B;
    
    // fck = fc28 - 1.65 * sd
    const fck = fc28 - 1.65 * sdControl;

    if (!autoWc) {
      const volCement = 1 / 3.1;
      const volSand = sandRatio / 2.63;
      const volGravel = gravelRatio / 2.65;
      const volWater = wcRatio;
      const totalVolume = volCement + volSand + volGravel + volWater;
      cementCons = 1000 / totalVolume;
      waterDemand = cementCons * wcRatio;
    }

    return {
      fc28: Math.max(0, fc28),
      fck: Math.max(0, fck),
      cementConsumption: cementCons,
      waterConsumption: waterDemand,
      calculatedWc: currentWc
    };
  }, [sandRatio, gravelRatio, wcRatio, cementClass, sdControl, autoWc]);

  const formatNum = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      
      {/* Inputs Column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#1C448E] p-4 text-white flex items-center gap-2">
            <Calculator size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Dados do Traço (em massa)</h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Trace Ratio */}
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Scale size={14} /> Proporção em Massa (1 : m1 : m2)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Cimento</div>
                  <div className="text-xl font-black text-slate-400">1</div>
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-[10px] text-slate-400 uppercase font-bold">Areia</div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={sandRatio} 
                    onChange={(e) => setSandRatio(Number(e.target.value))}
                    className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xl text-[#1C448E] focus:ring-2 focus:ring-[#0084CA] outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-3 text-[10px] text-slate-400 uppercase font-bold">Brita</div>
                  <input 
                    type="number" 
                    step="0.1"
                    value={gravelRatio} 
                    onChange={(e) => setGravelRatio(Number(e.target.value))}
                    className="w-full pt-6 pb-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xl text-[#1C448E] focus:ring-2 focus:ring-[#0084CA] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* W/C Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Droplets size={14} /> Relação Água/Cimento (a/c)
                </label>
                <button 
                  onClick={() => setAutoWc(!autoWc)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${autoWc ? 'bg-[#0084CA] text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  Slump = 60mm
                </button>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  disabled={autoWc}
                  value={autoWc ? results.calculatedWc.toFixed(2) : wcRatio} 
                  onChange={(e) => setWcRatio(Number(e.target.value))}
                  className={`w-full p-4 border rounded-xl font-bold text-2xl outline-none transition-all ${autoWc ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-50 border-slate-200 text-[#0084CA] focus:bg-white focus:ring-2 focus:ring-[#0084CA]'}`}
                />
                {autoWc && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#0084CA] bg-white px-2 py-1 rounded border border-[#0084CA]/20">
                    CALCULADO
                  </div>
                )}
              </div>
            </div>

            {/* Cement Class */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Classe do Cimento</label>
              <select 
                value={cementClass} 
                onChange={(e) => setCementClass(e.target.value as CementClass)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0084CA] transition-all"
              >
                <option value={CementClass.CP_25}>CP-25 (A=17, B=9)</option>
                <option value={CementClass.CP_32}>CP-32 (A=21, B=11)</option>
                <option value={CementClass.CP_40}>CP-40 (A=26, B=14)</option>
              </select>
            </div>

            {/* SD Control */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Controle de Desvio Padrão (sd)</label>
              <select 
                value={sdControl} 
                onChange={(e) => setSdControl(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0084CA] transition-all"
              >
                <option value={StandardDeviationControl.RIGOROSO}>Rigoroso (sd = 4.0 MPa)</option>
                <option value={StandardDeviationControl.RAZOAVEL}>Razoável (sd = 5.5 MPa)</option>
                <option value={StandardDeviationControl.REGULAR}>Regular (sd = 7.0 MPa)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
          <Info className="text-[#0084CA] shrink-0" size={20} />
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>Nota Técnica:</strong> A resistência depende do <strong>a/c</strong>. Se você aumentar os agregados e precisar de mais água para manter a trabalhabilidade, lembre-se de aumentar o campo <strong>a/c</strong> para ver a queda na resistência.
          </p>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-[#0084CA]/10 p-3 rounded-2xl">
              <Dumbbell className="text-[#0084CA]" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#1C448E] uppercase tracking-tight">Resistência Estimada</h3>
              <p className="text-slate-400 text-sm">Cálculo baseado no traço informado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* fck Card */}
            <div className="bg-gradient-to-br from-[#1C448E] to-[#0084CA] p-8 rounded-3xl text-white shadow-lg flex flex-col justify-center items-center text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-2">fck Estimado</div>
              <div className="text-6xl font-black mb-2">{formatNum(results.fck, 1)}</div>
              <div className="text-xl font-bold opacity-90">MPa</div>
            </div>

            {/* fc28 Card */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 flex flex-col justify-center items-center text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">fc28 Potencial</div>
              <div className="text-5xl font-black text-[#1C448E] mb-2">{formatNum(results.fc28, 1)}</div>
              <div className="text-lg font-bold text-slate-500">MPa</div>
            </div>
          </div>

          {/* Consumption Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                  <Calculator className="text-emerald-600" size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Cimento</h4>
                  <p className="text-[9px] text-emerald-600">Consumo/m³</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-700">{formatNum(results.cementConsumption, 0)}</span>
                <span className="text-[10px] font-bold text-emerald-600 ml-1">kg</span>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Droplets className="text-blue-600" size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800">Água</h4>
                  <p className="text-[9px] text-blue-600">Demanda/m³</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-blue-700">{formatNum(results.waterConsumption, 0)}</span>
                <span className="text-[10px] font-bold text-blue-600 ml-1">L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StrengthEstimator;
