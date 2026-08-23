import { SieveData, GranulometryResult } from '../types';

export const calculateGranulometry = (sieves: SieveData[]): GranulometryResult => {
  // Filter out the 'Fundo' (size 0) for MF calculation but keep it for total mass
  const totalMass = sieves.reduce((sum, s) => sum + s.retainedMass, 0);
  
  if (totalMass === 0) {
    return {
      sieves: sieves.map(s => ({ ...s, retainedPercentage: 0, cumulativeRetainedPercentage: 0, passingPercentage: 100 })),
      finenessModulus: 0,
      totalMass: 0
    };
  }

  let cumulativeRetained = 0;
  const processedSieves = sieves.map(s => {
    const retainedPercentage = (s.retainedMass / totalMass) * 100;
    cumulativeRetained += retainedPercentage;
    return {
      ...s,
      retainedPercentage,
      cumulativeRetainedPercentage: cumulativeRetained,
      passingPercentage: 100 - cumulativeRetained
    };
  });

  // MF = Sum of cumulative retained percentages on standard sieves / 100
  // Standard sieves for fine aggregate: 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15
  const standardSievesMF = [76, 38, 19, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
  
  const mfSum = processedSieves
    .filter(s => s.isStandard && standardSievesMF.includes(s.size))
    .reduce((sum, s) => sum + (s.cumulativeRetainedPercentage || 0), 0);
    
  const finenessModulus = mfSum / 100;

  return {
    sieves: processedSieves,
    finenessModulus,
    totalMass
  };
};
