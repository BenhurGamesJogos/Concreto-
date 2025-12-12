import React from 'react';
import { DosageResults, PadiolaSpecs } from '../types';
import { ClipboardList, Box, Droplets, Layers, Scale, HardHat, Ruler } from 'lucide-react';

interface Props {
  results: DosageResults;
}

const ResultsDisplay: React.FC<Props> = ({ results }) => {
  const formatNum = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard label="fc28 Calculado" value={`${formatNum(results.fc28, 1)} MPa`} icon={<ClipboardList className="text-[#0084CA]" />} />
        <ResultCard label="Relação a/c" value={formatNum(results.waterCementRatio, 3)} icon={<Droplets className="text-[#0084CA]" />} />
        <ResultCard label="Consumo Cimento" value={`${formatNum(results.cementContent, 0)} kg/m³`} icon={<Layers className="text-[#0084CA]" />} />
        <ResultCard label="Água Efetiva" value={`${formatNum(results.waterCorrected, 1)} L/m³`} icon={<Droplets className="text-[#0084CA]" />} />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-[#1C448E]">Resultados da Dosagem</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3">Massa Seca (kg/m³)</th>
                <th className="px-6 py-3 bg-blue-50/50">Massa Úmida (kg/m³)</th>
                <th className="px-6 py-3 font-bold text-[#1C448E] bg-blue-100/30">Para 1 m³ (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Cimento</td>
                <td className="px-6 py-3">{formatNum(results.cementContent)}</td>
                <td className="px-6 py-3 bg-blue-50/30">{formatNum(results.cementContent)}</td>
                <td className="px-6 py-3 font-bold text-[#0084CA] bg-blue-100/30">{formatNum(results.total.cement, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Areia (Miúdo)</td>
                <td className="px-6 py-3 text-slate-500">{formatNum(results.sandMassDryCorrected)}</td>
                <td className="px-6 py-3 font-semibold text-[#1C448E] bg-blue-50/30">{formatNum(results.sandMassWet)}</td>
                <td className="px-6 py-3 font-bold text-[#0084CA] bg-blue-100/30">{formatNum(results.total.sandWet, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Brita (Graúdo)</td>
                <td className="px-6 py-3">{formatNum(results.gravelMassDryCorrected)}</td>
                <td className="px-6 py-3 bg-blue-50/30">{formatNum(results.gravelMassDryCorrected)}</td>
                <td className="px-6 py-3 font-bold text-[#0084CA] bg-blue-100/30">{formatNum(results.total.gravel, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Água</td>
                <td className="px-6 py-3 text-slate-500">{formatNum(results.waterConsumption)}</td>
                <td className="px-6 py-3 font-semibold text-[#1C448E] bg-blue-50/30">{formatNum(results.waterCorrected)}</td>
                <td className="px-6 py-3 font-bold text-[#0084CA] bg-blue-100/30">{formatNum(results.total.water, 1)} L</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Traços */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Unitary Traces Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Traço em Peso */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#1C448E] mb-4 flex items-center gap-2">
              <Scale size={18} className="text-[#0084CA]"/> Traço em Peso
            </h3>
            <div className="bg-slate-100 p-4 rounded-lg text-center font-mono text-lg md:text-xl text-slate-700 border border-slate-200 overflow-x-auto">
               <div className="whitespace-nowrap">
                 1 : {formatNum(results.weightTrace.sand)} : {formatNum(results.weightTrace.gravel)} : {formatNum(results.weightTrace.water)}
               </div>
               <div className="text-xs text-slate-400 mt-2 font-sans">
                (Cimento : Areia : Brita : a/c)
               </div>
            </div>
          </div>

          {/* Traço em Volume */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-[#1C448E] mb-4 flex items-center gap-2">
              <Layers size={18} className="text-[#0084CA]"/> Traço em Volume
            </h3>
            <div className="bg-slate-100 p-4 rounded-lg text-center font-mono text-lg md:text-xl text-slate-700 border border-slate-200 overflow-x-auto">
               <div className="whitespace-nowrap">
                 1 : {formatNum(results.traceRatio.sand)} : {formatNum(results.traceRatio.gravel)} : {formatNum(results.traceRatio.water)}
               </div>
               <div className="text-xs text-slate-400 mt-2 font-sans">
                (Cimento : Areia : Brita : Água)
               </div>
            </div>
          </div>
        </div>

        {/* Instructions for Mixer Operator (Betoneiro) - Taking full column space now */}
        <div className="lg:col-span-7">
          <div className="bg-[#1C448E] rounded-xl shadow-lg border border-blue-900 p-6 text-white h-full flex flex-col">
             <div>
                <h3 className="font-bold text-white mb-1 flex items-center gap-2 text-xl">
                  <HardHat size={24} className="text-[#0084CA]"/> Instruções para o Betoneiro
                </h3>
                <p className="text-blue-200 text-sm mb-6 ml-8">Traço para <strong>1 Saco de Cimento (50kg)</strong></p>

                <div className="space-y-6">
                   {/* Padiolas Row */}
                   <div className="bg-blue-900/40 p-5 rounded-xl border border-blue-800">
                      <div className="flex items-center gap-2 mb-4">
                        <Ruler className="text-yellow-400" size={20} />
                        <h4 className="font-bold text-yellow-400 text-sm uppercase">1. Medir Agregados (Padiolas)</h4>
                      </div>
                      
                      <p className="text-blue-100 text-sm mb-4">
                        Utilizar padiolas com base padrão de <strong>35cm x 45cm</strong>.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PadiolaCard 
                           title="Areia" 
                           specs={results.padiolas.sand} 
                           colorClass="text-yellow-200"
                        />
                        <PadiolaCard 
                           title="Brita" 
                           specs={results.padiolas.gravel} 
                           colorClass="text-slate-200"
                        />
                      </div>
                      <div className="mt-3 text-[10px] text-blue-300 italic">
                       * Alturas arredondadas para cima (0.5cm). 
                       { (results.padiolas.sand.count > 1 || results.padiolas.gravel.count > 1) && 
                         " Volumes divididos em viagens para limitar altura a 30cm."
                       }
                      </div>
                   </div>

                   {/* Water Row - Added here since we removed the previous card */}
                   <div className="bg-blue-900/40 p-5 rounded-xl border border-blue-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="bg-blue-500/20 p-3 rounded-lg">
                           <Droplets className="text-blue-300" size={24} />
                         </div>
                         <div>
                            <h4 className="font-bold text-white text-sm uppercase">2. Adicionar Água</h4>
                            <p className="text-blue-200 text-xs">Volume final já descontando umidade da areia</p>
                         </div>
                      </div>
                      <div className="text-right bg-blue-950/30 px-6 py-2 rounded-lg border border-blue-500/30">
                         <div className="text-3xl font-bold text-white">{formatNum(results.sackTrace.waterVolumePerSack, 1)}</div>
                         <div className="text-sm text-blue-300 font-medium">Litros</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      
      </div>

      {/* Note */}
      <div className="bg-yellow-50 text-yellow-800 text-sm p-4 rounded-lg border border-yellow-100">
        <strong>Atenção:</strong> A quantidade de água calculada ({formatNum(results.waterCorrected, 1)} L) já considera o desconto da umidade da areia. No canteiro, ajuste a água conforme o teste de Slump.
      </div>

    </div>
  );
};

const PadiolaCard = ({ title, specs, colorClass }: { title: string, specs: PadiolaSpecs, colorClass: string }) => (
  <div className="border border-white/10 bg-white/5 rounded p-3 hover:bg-white/10 transition-colors">
    <div className={`font-semibold ${colorClass} text-sm mb-1`}>{title}</div>
    <div className="flex items-baseline gap-2">
       <span className="text-2xl font-bold">{specs.count}</span>
       <span className="text-sm opacity-80">{specs.count === 1 ? 'Viagem' : 'Viagens'} de:</span>
    </div>
    <div className="font-mono text-xl mt-1 tracking-wide">
      {specs.width} x {specs.length} x <span className="font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">{specs.height.toFixed(1)}</span> cm
    </div>
    <div className="text-[10px] opacity-60 mt-1">Largura x Comprimento x Altura</div>
  </div>
);

const ResultCard = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-24">
    <div className="flex justify-between items-start">
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      {icon}
    </div>
    <div className="text-xl font-bold text-[#1C448E]">{value}</div>
  </div>
);

export default ResultsDisplay;