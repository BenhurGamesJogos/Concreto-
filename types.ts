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

export enum LoadType {
  CONCENTRATED = 'CONCENTRATED',
  DISTRIBUTED = 'DISTRIBUTED',
  MOMENT = 'MOMENT'
}

export enum SupportType {
  PINNED = 'PINNED',
  ROLLER = 'ROLLER',
  FIXED = 'FIXED',
  HINGE = 'HINGE'
}

export interface BeamLoad {
  id: string;
  type: LoadType;
  position: number;
  value: number;
  endPosition?: number;
  endValue?: number;
}

export interface BeamSupport {
  id: string;
  type: SupportType;
  position: number;
}

export interface BeamData {
  length: number;
  supports: BeamSupport[];
  loads: BeamLoad[];
}

export interface FrameNode {
  id: string;
  x: number;
  y: number;
}

export interface FrameBar {
  id: string;
  startNodeId: string;
  endNodeId: string;
  hasStartHinge?: boolean;
  hasEndHinge?: boolean;
  eiFactor?: number; // Multiplicador de rigidez à flexão (ex: 1 para 1*EI, 2 para 2*EI, X para X*EI)
  eaFactor?: number; // Multiplicador de rigidez axial (ex: 1 para 1*EA, 2 para 2*EA)
  customE?: number;  // kN/m²
  customI?: number;  // m⁴
  customA?: number;  // m²
}

export enum FrameSupportType {
  PINNED = 'PINNED', // 2nd degree
  ROLLER_X = 'ROLLER_X', // 1st degree (restricts X)
  ROLLER_Y = 'ROLLER_Y', // 1st degree (restricts Y)
  FIXED = 'FIXED' // 3rd degree
}

export interface FrameSupport {
  id: string;
  nodeId: string;
  type: FrameSupportType;
}

export enum FrameLoadType {
  POINT_GLOBAL = 'POINT_GLOBAL',
  POINT_LOCAL = 'POINT_LOCAL',
  DISTRIBUTED_GLOBAL = 'DISTRIBUTED_GLOBAL',
  DISTRIBUTED_LOCAL = 'DISTRIBUTED_LOCAL',
  MOMENT = 'MOMENT'
}

export interface FrameLoad {
  id: string;
  type: FrameLoadType;
  nodeId?: string; // For loads at nodes
  barId?: string; // For loads on bars
  position?: number; // distance from start node [m]
  valueX?: number; // kN
  valueY?: number; // kN
  valueNormal?: number; // kN
  valuePerpendicular?: number; // kN
  valueMoment?: number; // kNm
  // For distributed
  endPosition?: number;
  isProjected?: boolean;
  valueXEnd?: number;
  valueYEnd?: number;
  valueNormalEnd?: number;
  valuePerpendicularEnd?: number;
}

export interface FrameData {
  nodes: FrameNode[];
  bars: FrameBar[];
  supports: FrameSupport[];
  loads: FrameLoad[];
  considerAxialDeformation?: boolean; // false = Barras Inextensíveis (Método da Flexibilidade Clássico), true = Deformável Real (EA)
  considerShearDeformation?: boolean; // false = Euler-Bernoulli (Clássico), true = Timoshenko (Cisalhamento)
}
