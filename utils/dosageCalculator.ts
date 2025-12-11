import { DosageInputs, DosageResults } from '../types';
import { CEMENT_CONSTANTS, DURABILITY_TABLE, WATER_TABLE, CEMENT_SACK_VOLUME_LITERS, CEMENT_SACK_WEIGHT_KG, CAN_VOLUME_LITERS } from '../constants';

// Helper to get water content from table
const getWaterContent = (slump: number, dmax: number): number => {
  // Find closest slump row
  const row = WATER_TABLE.reduce((prev, curr) => {
    return (Math.abs(curr.slump - slump) < Math.abs(prev.slump - slump) ? curr : prev);
  });

  // Find closest dmax column
  const dmaxKeys = [9.5, 19, 25, 38];
  const closestDmax = dmaxKeys.reduce((prev, curr) => {
    return (Math.abs(curr - dmax) < Math.abs(prev - dmax) ? curr : prev);
  });

  // @ts-ignore - access safe due to structure
  return row.dmax[closestDmax] || 200; // Fallback
};

export const calculateDosage = (inputs: DosageInputs): DosageResults => {
  // 1. Resistência fc28
  const fc28 = inputs.fck + 1.65 * inputs.sdControl;

  // 2. Quantidade de Água (a)
  const waterConsumption = getWaterContent(inputs.slump, inputs.dmc);

  // 3. Relação Água/Cimento (x)
  // a) Resistência
  const { A, B } = CEMENT_CONSTANTS[inputs.cementClass];
  const acResistence = A / (fc28 + B);

  // b) Durabilidade
  const acDurability = DURABILITY_TABLE[inputs.structureType][inputs.exposure];

  // Menor valor prevalece
  const waterCementRatio = Math.min(acResistence, acDurability);

  // 4. Teor de Cimento (c)
  const cementContent = waterConsumption / waterCementRatio;

  // 5. Teor de Agregado Total (M)
  // M = (1000 - c/gc - a) * gm
  // gm = média das massas específicas
  const gm = (inputs.sandSpecificMass + inputs.gravelSpecificMass) / 2;
  const totalAggregateMass = (1000 - (cementContent / inputs.cementSpecificMass) - waterConsumption) * gm;

  // 6. Proporção Areia/Brita (Mediana de 3 métodos)
  
  // Método A: Teor de argamassa seca (as)
  // M1 = as * (c + M) - c
  const asDecimal = inputs.alphaS / 100;
  const m1_methodA = (asDecimal * (cementContent + totalAggregateMass)) - cementContent;
  const sandRatioA = m1_methodA / totalAggregateMass;

  // Método B: Relação miúdo/total (am)
  // M1 = am * M
  const amDecimal = inputs.alphaM / 100;
  const m1_methodB = amDecimal * totalAggregateMass;
  const sandRatioB = m1_methodB / totalAggregateMass;

  // Método C: Teor real de argamassa (ar)
  // M2 = (1 - ar) * g_concreto
  // g_concreto estimate? PDF says: M2 = (1-ar) * g_concreto
  // We need g_concreto. Usually g_concreto = c + M + a (approx 2300-2400) if we assume volume=1m3
  // Let's calculate theoretical g_concreto first based on the mix so far.
  const g_concreto = cementContent + totalAggregateMass + waterConsumption; 
  const arDecimal = inputs.alphaR / 100;
  const m2_methodC = (1 - arDecimal) * g_concreto;
  const m1_methodC = totalAggregateMass - m2_methodC;
  const sandRatioC = m1_methodC / totalAggregateMass;

  // Calculate Median Ratio
  const ratios = [sandRatioA, sandRatioB, sandRatioC].sort((a, b) => a - b);
  const medianRatio = ratios[1];

  // Final Raw Masses
  const sandMassDry = totalAggregateMass * medianRatio; // M1
  const gravelMassDry = totalAggregateMass * (1 - medianRatio); // M2

  // 7. Correção das massas (Volume absoluto)
  // M1' = M1 * g1 / gm
  // M2' = M2 * g2 / gm
  const sandMassDryCorrected = (sandMassDry * inputs.sandSpecificMass) / gm;
  const gravelMassDryCorrected = (gravelMassDry * inputs.gravelSpecificMass) / gm;

  // 8. Correção de Umidade
  // Mh1' = M1' * (1 + h)
  const hDecimal = inputs.sandMoisture / 100;
  const sandMassWet = sandMassDryCorrected * (1 + hDecimal);
  
  // Correct water: a' = a - (Mh1' - M1')
  // The water carried by sand reduces the added water
  const waterCarriedBySand = sandMassWet - sandMassDryCorrected;
  const waterCorrected = waterConsumption - waterCarriedBySand;

  // 9. & 10. & 11. Results
  
  // Volume unitário (Traço)
  // v_c = 1
  // v_sand = (sandMassDryCorrected / cementContent) * (dc / d_sand) -- Wait, the PDF Method:
  // PDF 11: vc = c/dc, v1 = Mh1'/d1 ?? No, usually Trace is dry based for specification, but pad tools use wet.
  // PDF Step 10: Ratio by Mass (Dry): 1 : m1 : m2 : x
  // PDF Step 11: Ratio by Volume: 1 : n1 : n2 : na
  // n1 = v1/vc = (Mh1_or_Dry? / d1) / (c / dc)
  // Usually Volume Trace is based on DRY or WET depending on site. 
  // Step 11 Formula: v1 = Mh1' / d1. This implies using the WET sand mass for the volume calculation (common in Brazil site mix).
  // Let's follow PDF: v1 = Mh1'/d1.
  
  const volCement = cementContent / inputs.cementUnitMass; // Liters (if Mass is kg and UnitMass kg/L)
  const volSand = sandMassWet / inputs.sandUnitMass;
  const volGravel = gravelMassDryCorrected / inputs.gravelUnitMass;
  const volWater = waterCorrected; // Density 1

  // Normalize to Cement = 1
  const traceRatio = {
    cement: 1,
    sand: volSand / volCement,
    gravel: volGravel / volCement,
    water: volWater / volCement // This is effectively liters of water per volume of cement equivalent
  };

  // Weight Trace (Unitary) 1 : m1 : m2 : x
  // Uses corrected dry masses relative to cement mass
  const weightTrace = {
    cement: 1,
    sand: sandMassDryCorrected / cementContent,
    gravel: gravelMassDryCorrected / cementContent,
    water: waterCementRatio
  };

  // Sack Trace (50kg)
  // 1 sack = 35 liters (approx) or use mass/unit_mass
  const cementSacksTotal = (inputs.volumeTotal * cementContent) / CEMENT_SACK_WEIGHT_KG;
  
  // Volume per sack
  const sandVolPerSack = traceRatio.sand * CEMENT_SACK_VOLUME_LITERS; // Using 35L reference for volume ratio
  const gravelVolPerSack = traceRatio.gravel * CEMENT_SACK_VOLUME_LITERS;
  
  // Water per sack (mass balance approach is better for precision, but volume ratio * 35L is the site method)
  // Actually, Water per sack = (Water Total / Cement Total) * 50kg
  const waterPerSack = (waterCorrected / cementContent) * CEMENT_SACK_WEIGHT_KG;

  return {
    fc28,
    waterConsumption,
    waterCementRatio,
    cementContent,
    totalAggregateMass,
    sandMassDry,
    gravelMassDry,
    sandMassDryCorrected,
    gravelMassDryCorrected,
    sandMassWet,
    waterCorrected,
    perM3: {
      cement: cementContent,
      sandWet: sandMassWet,
      gravel: gravelMassDryCorrected,
      water: waterCorrected
    },
    total: {
      cement: cementContent * inputs.volumeTotal,
      sandWet: sandMassWet * inputs.volumeTotal,
      gravel: gravelMassDryCorrected * inputs.volumeTotal,
      water: waterCorrected * inputs.volumeTotal
    },
    weightTrace,
    traceRatio,
    sackTrace: {
      cementSacks: cementSacksTotal,
      sandVolumePerSack: sandVolPerSack,
      gravelVolumePerSack: gravelVolPerSack,
      waterVolumePerSack: waterPerSack,
      sandCansPerSack: sandVolPerSack / CAN_VOLUME_LITERS,
      gravelCansPerSack: gravelVolPerSack / CAN_VOLUME_LITERS
    }
  };
};