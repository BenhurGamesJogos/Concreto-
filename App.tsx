import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ResultsDisplay from './components/ResultsDisplay';
import { DosageInputs, DosageResults, CementClass, ExposureCondition, StructureType, StandardDeviationControl } from './types';
import { calculateDosage } from './utils/dosageCalculator';
import { DEFAULT_CEMENT_SPECIFIC_MASS } from './constants';

function App() {
  const [inputs, setInputs] = useState<DosageInputs>({
    volumeTotal: 10,
    fck: 25,
    sdControl: StandardDeviationControl.RAZOAVEL,
    slump: 60,
    cementClass: CementClass.CP_32,
    cementSpecificMass: DEFAULT_CEMENT_SPECIFIC_MASS,
    cementUnitMass: 1.4, // Typical loose bulk density approx
    dmc: 19,
    sandSpecificMass: 2.63,
    sandUnitMass: 1.5,
    sandMoisture: 3.0,
    gravelSpecificMass: 2.65,
    gravelUnitMass: 1.45,
    alphaS: 50, // 50%
    alphaM: 40, // 40%
    alphaR: 60, // 60%
    exposure: ExposureCondition.COMUM,
    structureType: StructureType.COMUM
  });

  const [results, setResults] = useState<DosageResults | null>(null);

  const handleCalculate = () => {
    try {
      const res = calculateDosage(inputs);
      setResults(res);
      // Smooth scroll to results
      setTimeout(() => {
        const element = document.getElementById('results-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error("Calculation error", error);
      alert("Ocorreu um erro no cálculo. Verifique os dados de entrada.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto grid gap-8">
          
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-slate-800">Calculadora de Dosagem</h2>
            <p className="text-slate-500 mt-2">Método de dosagem racional com correção de umidade e volume</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className={`lg:col-span-${results ? '5' : '12'} transition-all duration-500`}>
              <InputForm 
                inputs={inputs} 
                onChange={setInputs} 
                onCalculate={handleCalculate} 
              />
            </div>
            
            {results && (
              <div id="results-section" className="lg:col-span-7">
                <ResultsDisplay results={results} />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-200 text-slate-500 py-6 mt-12 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Nada Concreto - UFRN. Developed by Ben-Hur.</p>
        <p className="text-xs mt-1">Este aplicativo é uma ferramenta de apoio educacional.</p>
      </footer>
    </div>
  );
}

export default App;