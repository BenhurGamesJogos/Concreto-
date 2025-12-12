export enum CementClass {
  CP_25 = '25',
  CP_32 = '32',
  CP_40 = '40'
}

export enum ExposureCondition {
  COMUM = 'Comum',
  AMBIENTE_AGRESSIVO = 'Ambiente Agressivo'
}

export enum StructureType {
  DELGADA = 'Delgada',
  COMUM = 'Comum' // Used for both structure type and exposure condition context
}

export enum StandardDeviationControl {
  RIGOROSO = 4.0,
  RAZOAVEL = 5.5,
  REGULAR = 7.0
}

export interface DosageInputs {
  // Project Data
  volumeTotal: number; // m3
  fck: number; // MPa
  sdControl: StandardDeviationControl;
  slump: number; // mm
  
  // Cement Data
  cementClass: CementClass;
  cementSpecificMass: number; // kg/l (approx 3.1)
  cementUnitMass: number; // kg/l for volume conversion
  
  // Aggregate Data
  dmc: number; // Maximum diameter (mm)
  
  // Sand (Miúdo)
  sandSpecificMass: number; // kg/l
  sandUnitMass: number; // kg/l
  sandMoisture: number; // %
  sandSwell?: number; // inchamento (optional, simpler version ignores or assumes 1.0 for mass, needed for detailed volume pad)
  
  // Gravel (Graúdo)
  gravelSpecificMass: number; // kg/l
  gravelUnitMass: number; // kg/l
  
  // Algorithm Parameters (The 3 criteria)
  // Default values: as=50%, am=40%, ar=60%
  alphaS: number; // Teor de argamassa seca (%)
  alphaM: number; // Relação agregado miúdo/total (%)
  alphaR: number; // Teor real de argamassa (%)
  
  // Durability
  exposure: ExposureCondition;
  structureType: StructureType;
}

export interface PadiolaSpecs {
  count: number; // 1 or 2 trips
  width: number; // cm
  length: number; // cm
  height: number; // cm
}

export interface DosageResults {
  fc28: number;
  waterConsumption: number; // Liters
  waterCementRatio: number; // x
  cementContent: number; // kg
  
  // Raw Aggregates (Dry)
  totalAggregateMass: number; // M
  sandMassDry: number; // M1
  gravelMassDry: number; // M2
  
  // Corrected Aggregates (Specific Mass Correction)
  sandMassDryCorrected: number; // M1'
  gravelMassDryCorrected: number; // M2'
  
  // Moisture Corrected (Wet)
  sandMassWet: number; // Mh1'
  waterCorrected: number; // a'
  
  // Results per m3
  perM3: {
    cement: number;
    sandWet: number;
    gravel: number;
    water: number;
  };
  
  // Results for Total Volume
  total: {
    cement: number;
    sandWet: number;
    gravel: number;
    water: number;
  };
  
  // Weight Trace (Unitary) 1 : m1 : m2 : x (a/c)
  weightTrace: {
    cement: number;
    sand: number;
    gravel: number;
    water: number;
  };

  // Volume Trace (Unitary) 1 : n1 : n2 : na
  traceRatio: {
    cement: number;
    sand: number;
    gravel: number;
    water: number;
  };
  
  // Sack Trace (per 50kg sack)
  sackTrace: {
    cementSacks: number; // For total volume
    sandVolumePerSack: number; // Liters
    gravelVolumePerSack: number; // Liters
    waterVolumePerSack: number; // Liters
    sandCansPerSack: number; // Latas 18L (Exact)
    sandCansRounded: number; // Latas 18L (Rounded to 0.5)
    gravelCansPerSack: number; // Latas 18L (Exact)
    gravelCansRounded: number; // Latas 18L (Rounded to 0.5)
  };

  // Padiolas
  padiolas: {
    sand: PadiolaSpecs;
    gravel: PadiolaSpecs;
  };
}