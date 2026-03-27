import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { SieveData, GranulometryResult } from '../types';
import { calculateGranulometry } from '../utils/granulometryCalculator';
import { Calculator, BarChart, Info, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_SIEVES: SieveData[] = [
  { size: 9.5, label: '9.5 mm (3/8")', retainedMass: 0, isStandard: true },
  { size: 6.3, label: '6.3 mm (1/4")', retainedMass: 0, isStandard: false },
  { size: 4.75, label: '4.75 mm (#4)', retainedMass: 0, isStandard: true },
  { size: 2.36, label: '2.36 mm (#8)', retainedMass: 0, isStandard: true },
  { size: 1.18, label: '1.18 mm (#16)', retainedMass: 0, isStandard: true },
  { size: 0.6, label: '0.6 mm (#30)', retainedMass: 0, isStandard: true },
  { size: 0.3, label: '0.3 mm (#50)', retainedMass: 0, isStandard: true },
  { size: 0.15, label: '0.15 mm (#100)', retainedMass: 0, isStandard: true },
  { size: 0, label: 'Fundo', retainedMass: 0, isStandard: false }
];

const GranulometryTab: React.FC = () => {
  const [sieves, setSieves] = useState<SieveData[]>(INITIAL_SIEVES);
  
  const results = useMemo(() => calculateGranulometry(sieves), [sieves]);

  const handleMassChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newSieves = [...sieves];
    newSieves[index].retainedMass = numValue;
    setSieves(newSieves);
  };

  const resetSieves = () => {
    setSieves(INITIAL_SIEVES.map(s => ({ ...s, retainedMass: 0 })));
  };

  // Prepare data for the chart (filtering out 'Fundo' for the curve)
  const chartData = results.sieves
    .filter(s => s.size > 0)
    .sort((a, b) => a.size - b.size)
    .map(s => ({
      name: s.label,
      size: s.size,
      passing: parseFloat((s.passingPercentage || 0).toFixed(1))
    }));

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-[#1C448E] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Dados de Entrada</h3>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Massa Retida (g)</p>
                </div>
              </div>
              <button 
                onClick={resetSieves}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                title="Limpar tudo"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {sieves.map((sieve, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:border-[#0084CA]/30 hover:bg-white">
                    <div className="w-24">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{sieve.label}</span>
                    </div>
                    <div className="flex-grow relative">
                      <input 
                        type="number" 
                        value={sieve.retainedMass || ''} 
                        onChange={(e) => handleMassChange(idx, e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-transparent border-none focus:ring-0 text-right font-black text-[#1C448E] text-lg placeholder:text-slate-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-200 group-focus-within:bg-[#0084CA] transition-all"></div>
                    </div>
                    <div className="w-8 text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">g</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 rounded-3xl bg-[#1C448E]/5 border border-[#1C448E]/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Massa Total</p>
                  <p className="text-3xl font-black text-[#1C448E]">{results.totalMass.toFixed(1)} <span className="text-sm font-bold text-slate-400">g</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[#0084CA] uppercase tracking-widest mb-1">Módulo de Finura (MF)</p>
                  <p className="text-4xl font-black text-[#0084CA]">{results.finenessModulus.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
            <div className="p-2 bg-amber-100 rounded-xl h-fit">
              <Info className="text-amber-600" size={20} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Nota Técnica</h4>
              <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                O Módulo de Finura (MF) é calculado pela soma das porcentagens retidas acumuladas nas peneiras da série normal, dividida por 100. 
                As peneiras da série normal para agregado miúdo são: 9.5, 4.75, 2.36, 1.18, 0.6, 0.3 e 0.15 mm.
              </p>
            </div>
          </div>
        </div>

        {/* Results & Chart Section */}
        <div className="lg:col-span-7 space-y-8">
          {/* Table of Results */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 p-6 text-white flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <BarChart size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Distribuição Granulométrica</h3>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Resultados Calculados</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peneira</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Retida (g)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Retida (%)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acumulada (%)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Passante (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.sieves.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`text-xs font-black ${s.isStandard ? 'text-[#1C448E]' : 'text-slate-400'} uppercase`}>{s.label}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600 text-sm">{s.retainedMass.toFixed(1)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600 text-sm">{(s.retainedPercentage || 0).toFixed(1)}%</td>
                      <td className="px-6 py-4 text-right font-black text-[#1C448E] text-sm">{(s.cumulativeRetainedPercentage || 0).toFixed(1)}%</td>
                      <td className="px-6 py-4 text-right font-black text-[#0084CA] text-sm">{(s.passingPercentage || 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-[#1C448E] uppercase tracking-tight">Curva Granulométrica</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Porcentagem Passante vs. Abertura (mm)</p>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="size" 
                    reversed={true}
                    type="number"
                    domain={['auto', 'auto']}
                    scale="log"
                    ticks={[0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 6.3, 9.5]}
                    label={{ value: 'Abertura da Peneira (mm)', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8' }}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    label={{ value: '% Passante Acumulada', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', fill: '#94a3b8' }}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 900, color: '#1C448E', marginBottom: '4px', fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="passing" 
                    stroke="#0084CA" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#0084CA', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    name="% Passante"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GranulometryTab;
