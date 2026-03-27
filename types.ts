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
  COMUM = 'Comum'
}

export enum StandardDeviationControl {
  RIGOROSO = 4.0,
  RAZOAVEL = 5.5,
  REGULAR = 7.0
}

export enum UserRole {
  ADMIN = 'ADMIN',
  NORMAL = 'NORMAL'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
}

export interface DosageInputs {
  volumeTotal: number;
  fck: number;
  sdControl: StandardDeviationControl;
  slump: number;
  cementClass: CementClass;
  cementSpecificMass: number;
  cementUnitMass: number;
  dmc: number;
  sandSpecificMass: number;
  sandUnitMass: number;
  sandMoisture: number;
  sandSwell?: number;
  gravelSpecificMass: number;
  gravelUnitMass: number;
  alphaS: number;
  alphaM: number;
  alphaR: number;
  exposure: ExposureCondition;
  structureType: StructureType;
  padiolaWidth?: number;
  padiolaLength?: number;
}

export interface PadiolaSpecs {
  count: number;
  width: number;
  length: number;
  height: number;
}

export interface DosageResults {
  fc28: number;
  waterConsumption: number;
  waterCementRatio: number;
  cementContent: number;
  totalAggregateMass: number;
  sandMassDry: number;
  gravelMassDry: number;
  sandMassDryCorrected: number;
  gravelMassDryCorrected: number;
  sandMassWet: number;
  waterCorrected: number;
  perM3: {
    cement: number;
    sandWet: number;
    gravel: number;
    water: number;
  };
  total: {
    cement: number;
    sandWet: number;
    gravel: number;
    water: number;
  };
  weightTrace: {
    cement: number;
    sand: number;
    gravel: number;
    water: number;
  };
  traceRatio: {
    cement: number;
    sand: number;
    gravel: number;
    water: number;
  };
  sackTrace: {
    cementSacks: number;
    sandVolumePerSack: number;
    gravelVolumePerSack: number;
    waterVolumePerSack: number;
    sandCansPerSack: number;
    sandCansRounded: number;
    gravelCansPerSack: number;
    gravelCansRounded: number;
  };
  padiolas: {
    sand: PadiolaSpecs;
    gravel: PadiolaSpecs;
  };
  fck: number;
  slump: number;
}

export interface SieveData {
  size: number;
  label: string;
  retainedMass: number;
  retainedPercentage?: number;
  cumulativeRetainedPercentage?: number;
  passingPercentage?: number;
  isStandard: boolean;
}

export interface GranulometryResult {
  sieves: SieveData[];
  finenessModulus: number;
  totalMass: number;
}
