import React from 'react';
import { DosageResults } from '../types';
import { ClipboardList, Box, Droplets, Layers, Scale } from 'lucide-react';

interface Props {
  results: DosageResults;
}

const ResultsDisplay: React.FC<Props> = ({ results }) => {
  const formatNum = (n: number, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultCard label="fc28 Calculado" value={`${formatNum(results.fc28, 1)} MPa`} icon={<ClipboardList className="text-blue-500" />} />
        <ResultCard label="Relação a/c" value={formatNum(results.waterCementRatio, 3)} icon={<Droplets className="text-blue-500" />} />
        <ResultCard label="Consumo Cimento" value={`${formatNum(results.cementContent, 0)} kg/m³`} icon={<Layers className="text-blue-500" />} />
        <ResultCard label="Água Efetiva" value={`${formatNum(results.waterCorrected, 1)} L/m³`} icon={<Droplets className="text-blue-500" />} />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Resultados da Dosagem</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3">Massa Seca (kg/m³)</th>
                <th className="px-6 py-3 bg-blue-50/50">Massa Úmida (kg/m³)</th>
                <th className="px-6 py-3 font-bold text-indigo-900 bg-indigo-50">Para Volume Total (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Cimento</td>
                <td className="px-6 py-3">{formatNum(results.cementContent)}</td>
                <td className="px-6 py-3 bg-blue-50/30">{formatNum(results.cementContent)}</td>
                <td className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50">{formatNum(results.total.cement, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Areia (Miúdo)</td>
                <td className="px-6 py-3 text-slate-500">{formatNum(results.sandMassDryCorrected)}</td>
                <td className="px-6 py-3 font-semibold text-blue-700 bg-blue-50/30">{formatNum(results.sandMassWet)}</td>
                <td className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50">{formatNum(results.total.sandWet, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Brita (Graúdo)</td>
                <td className="px-6 py-3">{formatNum(results.gravelMassDryCorrected)}</td>
                <td className="px-6 py-3 bg-blue-50/30">{formatNum(results.gravelMassDryCorrected)}</td>
                <td className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50">{formatNum(results.total.gravel, 1)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Água</td>
                <td className="px-6 py-3 text-slate-500">{formatNum(results.waterConsumption)}</td>
                <td className="px-6 py-3 font-semibold text-blue-700 bg-blue-50/30">{formatNum(results.waterCorrected)}</td>
                <td className="px-6 py-3 font-bold text-indigo-700 bg-indigo-50/50">{formatNum(results.total.water, 1)} L</td>
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
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Scale size={18} className="text-slate-500"/> Traço em Peso
            </h3>
            <div className="bg-slate-100 p-4 rounded-lg text-center font-mono text-lg md:text-xl text-slate-700 border border-slate-200">
               1 : {formatNum(results.weightTrace.sand)} : {formatNum(results.weightTrace.gravel)} : {formatNum(results.weightTrace.water)}
               <div className="text-xs text-slate-400 mt-2 font-sans">
                (Cimento : Areia : Brita : a/c)
               </div>
            </div>
          </div>

          {/* Traço em Volume */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers size={18} className="text-slate-500"/> Traço em Volume
            </h3>
            <div className="bg-slate-100 p-4 rounded-lg text-center font-mono text-lg md:text-xl text-slate-700 border border-slate-200">
               1 : {formatNum(results.traceRatio.sand)} : {formatNum(results.traceRatio.gravel)} : {formatNum(results.traceRatio.water)}
               <div className="text-xs text-slate-400 mt-2 font-sans">
                (Cimento : Areia : Brita : Água)
               </div>
            </div>
          </div>
        </div>

        {/* Padiola / Saco Column */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Box size={18} className="text-slate-500"/> Traço por Saco (50kg)
            </h3>
            
            <div className="space-y-6">
               <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                 <span className="text-sm text-slate-600">Total Sacos Necessários</span>
                 <span className="font-bold text-2xl text-indigo-600">{formatNum(results.sackTrace.cementSacks, 1)} <span className="text-base font-normal text-slate-500">unid</span></span>
               </div>
               
               <div className="space-y-4">
                 <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Para cada saco de 50kg:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                   <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex flex-col justify-center">
                      <div className="text-xs text-yellow-800 font-medium mb-1">Areia Úmida</div>
                      <div className="font-bold text-xl text-yellow-900">{formatNum(results.sackTrace.sandCansPerSack, 1)} Latas</div>
                      <div className="text-[10px] text-yellow-700/70 mt-1">(Lata 18L)</div>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-center">
                      <div className="text-xs text-slate-800 font-medium mb-1">Brita</div>
                      <div className="font-bold text-xl text-slate-900">{formatNum(results.sackTrace.gravelCansPerSack, 1)} Latas</div>
                      <div className="text-[10px] text-slate-500 mt-1">(Lata 18L)</div>
                   </div>
                   <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center">
                      <div className="text-xs text-blue-800 font-medium mb-1">Água</div>
                      <div className="font-bold text-xl text-blue-900">{formatNum(results.sackTrace.waterVolumePerSack, 1)} L</div>
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

const ResultCard = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-24">
    <div className="flex justify-between items-start">
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      {icon}
    </div>
    <div className="text-xl font-bold text-slate-800">{value}</div>
  </div>
);

export default ResultsDisplay;