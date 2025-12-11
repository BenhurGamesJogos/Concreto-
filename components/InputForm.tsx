import React from 'react';
import { DosageInputs, CementClass, ExposureCondition, StructureType, StandardDeviationControl } from '../types';
import { Info } from 'lucide-react';

interface Props {
  inputs: DosageInputs;
  onChange: (inputs: DosageInputs) => void;
  onCalculate: () => void;
}

const InputForm: React.FC<Props> = ({ inputs, onChange, onCalculate }) => {
  
  const handleChange = (field: keyof DosageInputs, value: any) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-semibold text-[#1C448E] flex items-center gap-2">
          Dados de Entrada
        </h2>
        <p className="text-sm text-slate-500 mt-1">Preencha os parâmetros do projeto e materiais.</p>
      </div>

      <div className="p-6 grid gap-8">
        
        {/* Section 1: Concrete Requirements */}
        <div>
          <h3 className="text-sm uppercase tracking-wide text-[#0084CA] font-bold mb-4 border-b border-blue-100 pb-2">
            1. Dados do Projeto
          </h3>
          {/* Changed to single column on small, 2 cols on medium. Removed tight constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Resistência fck (MPa)</label>
              <input 
                type="number" 
                value={inputs.fck} 
                onChange={(e) => handleChange('fck', parseFloat(e.target.value))}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0084CA] focus:ring-[#0084CA] border p-2"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Controle Desvio Padrão (Sd)</label>
              <select 
                value={inputs.sdControl} 
                onChange={(e) => handleChange('sdControl', parseFloat(e.target.value))}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0084CA] focus:ring-[#0084CA] border p-2 bg-white"
              >
                <option value={StandardDeviationControl.RIGOROSO}>Rigoroso (4.0 MPa)</option>
                <option value={StandardDeviationControl.RAZOAVEL}>Razoável (5.5 MPa)</option>
                <option value={StandardDeviationControl.REGULAR}>Regular (7.0 MPa)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
             <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Abatimento / Slump (mm)</label>
              <select 
                value={inputs.slump} 
                onChange={(e) => handleChange('slump', parseFloat(e.target.value))}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0084CA] focus:ring-[#0084CA] border p-2 bg-white"
              >
                {[10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 180].map(v => (
                   <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Condição de Exposição</label>
              <select 
                value={inputs.exposure} 
                onChange={(e) => handleChange('exposure', e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0084CA] focus:ring-[#0084CA] border p-2 bg-white"
              >
                <option value={ExposureCondition.COMUM}>Comum</option>
                <option value={ExposureCondition.AMBIENTE_AGRESSIVO}>Ambiente Agressivo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Tipo de Peça</label>
              <select 
                value={inputs.structureType} 
                onChange={(e) => handleChange('structureType', e.target.value)}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#0084CA] focus:ring-[#0084CA] border p-2 bg-white"
              >
                <option value={StructureType.COMUM}>Comum</option>
                <option value={StructureType.DELGADA}>Delgada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Materials */}
        <div>
          <h3 className="text-sm uppercase tracking-wide text-[#0084CA] font-bold mb-4 border-b border-blue-100 pb-2">
            2. Materiais
          </h3>
          
          {/* Changed to 2 columns max to prevent squishing when side panel is active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Cement */}
            <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-100">
              <span className="font-semibold text-slate-700 block text-sm">Cimento</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <div>
                    <label className="text-xs text-slate-500">Classe</label>
                    <select 
                    value={inputs.cementClass} 
                    onChange={(e) => handleChange('cementClass', e.target.value)}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    >
                    <option value={CementClass.CP_25}>CP-25</option>
                    <option value={CementClass.CP_32}>CP-32</option>
                    <option value={CementClass.CP_40}>CP-40</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Massa Esp. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.cementSpecificMass}
                    onChange={(e) => handleChange('cementSpecificMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-slate-500">Massa Unit. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.cementUnitMass}
                    onChange={(e) => handleChange('cementUnitMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
              </div>
            </div>

            {/* Aggregates Common */}
            <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-100">
              <span className="font-semibold text-slate-700 block text-sm">Geral Agregados</span>
              <div>
                 <label className="text-xs text-slate-500">DMC Brita (mm)</label>
                 <select 
                    value={inputs.dmc} 
                    onChange={(e) => handleChange('dmc', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                  >
                    {[9.5, 19, 25, 38].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
              </div>
            </div>

            {/* Sand */}
            <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-100">
              <span className="font-semibold text-slate-700 block text-sm">Areia (Miúdo)</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                  <div>
                    <label className="text-xs text-slate-500">Massa Esp. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.sandSpecificMass}
                    onChange={(e) => handleChange('sandSpecificMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Massa Unit. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.sandUnitMass}
                    onChange={(e) => handleChange('sandUnitMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-slate-500">Umidade (%)</label>
                    <input 
                    type="number" step="0.1"
                    value={inputs.sandMoisture}
                    onChange={(e) => handleChange('sandMoisture', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1 bg-blue-50"
                    />
                </div>
              </div>
            </div>

            {/* Gravel */}
            <div className="space-y-3 p-3 bg-slate-50 rounded border border-slate-100">
              <span className="font-semibold text-slate-700 block text-sm">Brita (Graúdo)</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <div>
                    <label className="text-xs text-slate-500">Massa Esp. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.gravelSpecificMass}
                    onChange={(e) => handleChange('gravelSpecificMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Massa Unit. (kg/dm³)</label>
                    <input 
                    type="number" step="0.01"
                    value={inputs.gravelUnitMass}
                    onChange={(e) => handleChange('gravelUnitMass', parseFloat(e.target.value))}
                    className="w-full text-sm border-slate-300 rounded border p-1"
                    />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Advanced Coefficients */}
        <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
          <h3 className="text-sm font-bold text-[#1C448E] mb-2 flex items-center gap-2">
            <Info size={16} /> Parâmetros de Cálculo (Mediana)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Teor Argamassa Seca (as %)</label>
              <input 
                type="number" 
                value={inputs.alphaS} 
                onChange={(e) => handleChange('alphaS', parseFloat(e.target.value))}
                className="w-full mt-1 text-sm rounded border-slate-300 border p-1"
              />
              <span className="text-[10px] text-slate-500">Usual: 45-55%</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Relação Miúdo/Total (am %)</label>
              <input 
                type="number" 
                value={inputs.alphaM} 
                onChange={(e) => handleChange('alphaM', parseFloat(e.target.value))}
                className="w-full mt-1 text-sm rounded border-slate-300 border p-1"
              />
              <span className="text-[10px] text-slate-500">Usual: 34-42%</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Teor Real Argamassa (ar %)</label>
              <input 
                type="number" 
                value={inputs.alphaR} 
                onChange={(e) => handleChange('alphaR', parseFloat(e.target.value))}
                className="w-full mt-1 text-sm rounded border-slate-300 border p-1"
              />
              <span className="text-[10px] text-slate-500">Usual: 55-60%</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onCalculate}
          className="w-full bg-[#1C448E] hover:bg-[#163672] text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-md flex justify-center items-center gap-2"
        >
          <Hammer size={20} className="text-[#0084CA]" />
          Calcular Dosagem
        </button>
      </div>
    </div>
  );
};

// Simple Icon component for button
const Hammer = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
    <path d="M17.64 15 22 10.64" />
    <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H16.4c-.84 0-1.65-.33-2.25-.93L12.9 4.7a1.001 1.001 0 0 0-1.41 0l-1.83 1.83" />
  </svg>
);

export default InputForm;