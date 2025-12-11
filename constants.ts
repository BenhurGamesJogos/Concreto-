import { CementClass, StructureType, ExposureCondition } from './types';

// Page 1: Tabela 2 - Quantidade de água
// Rows: Slump (mm), Cols: Dmax (mm) -> 9.5, 19, 25, 38
// We will implement a helper to find the closest match or interpolate if needed, 
// but strictly following the PDF, we assume discrete steps.
export const WATER_TABLE = [
  { slump: 10, dmax: { 9.5: 183, 19: 162, 25: 154, 38: 143 } },
  { slump: 20, dmax: { 9.5: 196, 19: 173, 25: 165, 38: 153 } },
  { slump: 30, dmax: { 9.5: 204, 19: 180, 25: 172, 38: 159 } },
  { slump: 40, dmax: { 9.5: 210, 19: 186, 25: 177, 38: 164 } },
  { slump: 50, dmax: { 9.5: 215, 19: 190, 25: 181, 38: 167 } },
  { slump: 60, dmax: { 9.5: 219, 19: 193, 25: 184, 171: 171 } }, // Note: 171 key logic fix in usage
  { slump: 80, dmax: { 9.5: 225, 19: 199, 25: 189, 38: 176 } },
  { slump: 100, dmax: { 9.5: 230, 19: 203, 25: 194, 38: 180 } },
  { slump: 120, dmax: { 9.5: 235, 19: 207, 25: 197, 38: 183 } },
  { slump: 150, dmax: { 9.5: 240, 19: 212, 25: 202, 38: 187 } },
  { slump: 180, dmax: { 9.5: 244, 19: 216, 25: 205, 38: 190 } },
];

// Page 1: Tabela - Constantes do cimento (A' e B')
export const CEMENT_CONSTANTS: Record<CementClass, { A: number; B: number }> = {
  [CementClass.CP_25]: { A: 17, B: 9 },
  [CementClass.CP_32]: { A: 21, B: 11 },
  [CementClass.CP_40]: { A: 26, B: 14 },
};

// Page 1: Tabela - Critério de Durabilidade (Max a/c)
// Key: StructureType + Exposure
export const DURABILITY_TABLE = {
  [StructureType.DELGADA]: {
    [ExposureCondition.COMUM]: 0.45,
    [ExposureCondition.AMBIENTE_AGRESSIVO]: 0.40,
  },
  [StructureType.COMUM]: {
    [ExposureCondition.COMUM]: 0.50,
    [ExposureCondition.AMBIENTE_AGRESSIVO]: 0.45,
  },
};

// Defaults
export const DEFAULT_CEMENT_SPECIFIC_MASS = 3.1;
export const CEMENT_SACK_VOLUME_LITERS = 35; // approx volume of 50kg sack
export const CEMENT_SACK_WEIGHT_KG = 50;
export const CAN_VOLUME_LITERS = 18; // Standard construction can volume