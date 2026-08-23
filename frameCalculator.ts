import { FrameData, FrameNode, FrameBar, FrameSupport, FrameLoad, FrameSupportType, FrameLoadType } from '../types';

export interface ReactionResult {
  nodeId: string;
  fx: number; // kN (global X)
  fy: number; // kN (global Y)
  mz: number; // kNm (global Z moment, positive CCW)
}

export interface InternalEfforts {
  x: number; // position along bar [m]
  n: number; // normal force [kN] (+ tension, - compression)
  v: number; // shear force [kN]
  m: number; // bending moment [kNm] (positive for tension on reference/bottom side)
  deflection?: number; // transversal deflection [mm]
  dxGlobal?: number; // deformed global X position
  dyGlobal?: number; // deformed global Y position
}

export interface BarResult {
  barId: string;
  length: number;
  angleDeg: number;
  points: InternalEfforts[];
  startNodeEfforts: { n: number; v: number; m: number };
  endNodeEfforts: { n: number; v: number; m: number };
  maxNormal: { val: number; x: number };
  minNormal: { val: number; x: number };
  maxShear: { val: number; x: number };
  minShear: { val: number; x: number };
  maxMoment: { val: number; x: number };
  minMoment: { val: number; x: number };
  localDisplacements: number[]; // [u1, v1, th1, u2, v2, th2]
  localKMatrix?: number[][];
  globalKMatrix?: number[][];
  transMatrix?: number[][];
}

export interface NodeDisplacement {
  nodeId: string;
  dx: number; // mm
  dy: number; // mm
  rotZ: number; // rad
  rotZDeg: number; // degrees
}

export interface StiffnessStepDetail {
  title: string;
  description: string;
  matrixData?: number[][];
  vectorData?: number[];
  labels?: string[];
}

export interface FrameAnalysisResult {
  isValid: boolean;
  errorMessage?: string;
  reactions: ReactionResult[];
  barResults: BarResult[];
  nodeDisplacements: NodeDisplacement[];
  isHyperstatic: boolean;
  degreeOfFreedom: number;
  totalNodes: number;
  totalBars: number;
  equilibriumCheck: {
    sumFx: number;
    sumFy: number;
    sumMz: number;
    isBalanced: boolean;
  };
  globalMatrixPreview?: {
    size: number;
    matrix: number[][];
    loadVector: number[];
    displacementVector: number[];
    dofLabels: string[];
  };
  steps: StiffnessStepDetail[];
}

/**
 * Solves 2D Plane Frames using the Direct Stiffness Method (Método da Rigidez Direta).
 * Handles:
 * - Arbitrary node coordinates & inclined members (barras inclinadas).
 * - Internal hinges (rótulas em nós / extremidades de barras).
 * - Any support boundary conditions (Engaste, Apoio Fixo, Apoio Móvel X/Y).
 * - Nodal loads (Fx, Fy, Mz) and Member loads (Distributed & Point, Local & Global).
 * - Isostatic & Hyperstatic frames.
 */
export function analyzeFrame(frame: FrameData): FrameAnalysisResult {
  const { nodes, bars, supports, loads } = frame;

  if (nodes.length < 2 || bars.length < 1) {
    return {
      isValid: false,
      errorMessage: 'Adicione pelo menos 2 nós e 1 barra para realizar a análise.',
      reactions: [],
      barResults: [],
      nodeDisplacements: [],
      isHyperstatic: false,
      degreeOfFreedom: 0,
      totalNodes: nodes.length,
      totalBars: bars.length,
      equilibriumCheck: { sumFx: 0, sumFy: 0, sumMz: 0, isBalanced: false },
      steps: []
    };
  }

  // Material & Section constants (Steel/Concrete standard elastic modulus & typical frame section)
  const E = 2.1e8; // kN/m² (Steel ~210 GPa / Standard benchmark)
  const A = 0.01;  // m² (100 cm²)
  const I = 0.0001; // m⁴ (10,000 cm⁴)
  const EI = E * I;
  const EA = E * A;

  const numNodes = nodes.length;
  const DOF_PER_NODE = 3; // [Ux, Uy, Rz]
  const totalDOF = numNodes * DOF_PER_NODE;

  const nodeMap = new Map<string, number>();
  nodes.forEach((node, i) => nodeMap.set(node.id, i));

  // Global stiffness matrix & Force vectors
  const K = Array.from({ length: totalDOF }, () => new Float64Array(totalDOF).fill(0));
  const F = new Float64Array(totalDOF).fill(0);
  const directNodalF = new Float64Array(totalDOF).fill(0);
  const equivNodalF = new Float64Array(totalDOF).fill(0);

  const barDetailedData = new Map<string, {
    L: number;
    cos: number;
    sin: number;
    kLocal: number[][];
    kGlobal: number[][];
    T: number[][];
    fefLocal: Float64Array;
  }>();

  // 1. Assemble Global Stiffness Matrix
  bars.forEach(bar => {
    const startIdx = nodeMap.get(bar.startNodeId);
    const endIdx = nodeMap.get(bar.endNodeId);
    if (startIdx === undefined || endIdx === undefined) return;

    const n1 = nodes[startIdx];
    const n2 = nodes[endIdx];

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < 0.0001) return;

    const c = dx / L;
    const s = dy / L;

    // Standard 6x6 local stiffness matrix with individual bar stiffness (EI and EA)
    const barEIFactor = bar.eiFactor !== undefined && bar.eiFactor > 0 ? bar.eiFactor : 1;
    const barEAFactor = bar.eaFactor !== undefined && bar.eaFactor > 0 ? bar.eaFactor : 1;

    const barE = bar.customE || E;
    const barI = bar.customI || (I * barEIFactor);
    const barA = bar.customA || (A * barEAFactor);

    const barEI = barE * barI;
    
    // Axial deformation consideration:
    // If considerAxialDeformation is false (default/classical manual method), bars are treated as axially inextensible (EA -> infinity).
    const considerAxial = frame.considerAxialDeformation ?? false;
    const barEA = (barE * barA) * (considerAxial ? 1 : 1e7);

    // Shear deformation consideration (Timoshenko vs Euler-Bernoulli):
    const considerShear = frame.considerShearDeformation ?? false;
    let phi = 0;
    if (considerShear) {
      const nu = 0.2; // Poisson ratio
      const G = barE / (2 * (1 + nu));
      const As = (5 / 6) * barA; // Shear area for rectangular section
      phi = (12 * barEI) / (G * As * L * L);
    }

    const kLocal = Array.from({ length: 6 }, () => new Float64Array(6).fill(0));

    const EA_L = barEA / L;
    const denomPhi = 1 + phi;
    const EI12_L3 = (12 * barEI) / (L * L * L * denomPhi);
    const EI6_L2 = (6 * barEI) / (L * L * denomPhi);
    const EI4_L = ((4 + phi) * barEI) / (L * denomPhi);
    const EI2_L = ((2 - phi) * barEI) / (L * denomPhi);

    kLocal[0][0] = EA_L;  kLocal[0][3] = -EA_L;
    kLocal[3][0] = -EA_L; kLocal[3][3] = EA_L;

    kLocal[1][1] = EI12_L3;  kLocal[1][2] = EI6_L2;   kLocal[1][4] = -EI12_L3; kLocal[1][5] = EI6_L2;
    kLocal[2][1] = EI6_L2;   kLocal[2][2] = EI4_L;    kLocal[2][4] = -EI6_L2;  kLocal[2][5] = EI2_L;
    kLocal[4][1] = -EI12_L3; kLocal[4][2] = -EI6_L2;  kLocal[4][4] = EI12_L3;  kLocal[4][5] = -EI6_L2;
    kLocal[5][1] = EI6_L2;   kLocal[5][2] = EI2_L;    kLocal[5][4] = -EI6_L2;  kLocal[5][5] = EI4_L;

    // Handle Member Releases (Rótulas nas extremidades)
    if (bar.hasStartHinge && bar.hasEndHinge) {
      // Both ends hinged (truss-like for bending)
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          if (i !== 0 && i !== 3 && j !== 0 && j !== 3) {
            kLocal[i][j] = 0;
          }
        }
      }
    } else if (bar.hasStartHinge) {
      // Release at start (i = 2) -> Moment at start = 0
      const denomHinge = 1 + phi / 4;
      const EI3_L3 = (3 * barEI) / (L * L * L * denomHinge);
      const EI3_L2 = (3 * barEI) / (L * L * denomHinge);
      const EI3_L = (3 * barEI) / (L * denomHinge);

      kLocal[1][1] = EI3_L3;   kLocal[1][2] = 0; kLocal[1][4] = -EI3_L3; kLocal[1][5] = EI3_L2;
      kLocal[2][1] = 0;        kLocal[2][2] = 0; kLocal[2][4] = 0;       kLocal[2][5] = 0;
      kLocal[4][1] = -EI3_L3;  kLocal[4][2] = 0; kLocal[4][4] = EI3_L3;  kLocal[4][5] = -EI3_L2;
      kLocal[5][1] = EI3_L2;   kLocal[5][2] = 0; kLocal[5][4] = -EI3_L2; kLocal[5][5] = EI3_L;
    } else if (bar.hasEndHinge) {
      // Release at end (j = 5) -> Moment at end = 0
      const denomHinge = 1 + phi / 4;
      const EI3_L3 = (3 * barEI) / (L * L * L * denomHinge);
      const EI3_L2 = (3 * barEI) / (L * L * denomHinge);
      const EI3_L = (3 * barEI) / (L * denomHinge);

      kLocal[1][1] = EI3_L3;   kLocal[1][2] = EI3_L2;  kLocal[1][4] = -EI3_L3; kLocal[1][5] = 0;
      kLocal[2][1] = EI3_L2;   kLocal[2][2] = EI3_L;   kLocal[2][4] = -EI3_L2; kLocal[2][5] = 0;
      kLocal[4][1] = -EI3_L3;  kLocal[4][2] = -EI3_L2; kLocal[4][4] = EI3_L3;  kLocal[4][5] = 0;
      kLocal[5][1] = 0;        kLocal[5][2] = 0;       kLocal[5][4] = 0;       kLocal[5][5] = 0;
    }

    // 6x6 Transformation Matrix T
    const T: number[][] = [
      [c, s, 0, 0, 0, 0],
      [-s, c, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0],
      [0, 0, 0, -s, c, 0],
      [0, 0, 0, 0, 0, 1]
    ];

    const kLocalArr = kLocal.map(row => Array.from(row));
    const kGlobal = multiply(transpose(T), multiply(kLocalArr, T));

    // Add to Global K
    const indices = [
      startIdx * 3, startIdx * 3 + 1, startIdx * 3 + 2,
      endIdx * 3, endIdx * 3 + 1, endIdx * 3 + 2
    ];

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[indices[i]][indices[j]] += kGlobal[i][j];
      }
    }

    barDetailedData.set(bar.id, {
      L,
      cos: c,
      sin: s,
      kLocal: kLocalArr,
      kGlobal,
      T,
      fefLocal: new Float64Array(6).fill(0)
    });
  });

  // 2. Direct Nodal Loads
  loads.filter(l => l.nodeId).forEach(l => {
    const nodeIdx = nodeMap.get(l.nodeId!);
    if (nodeIdx === undefined) return;

    const valX = l.valueX || 0;
    const valY = l.valueY || 0;
    const valM = l.valueMoment || 0;

    F[nodeIdx * 3] += valX;
    F[nodeIdx * 3 + 1] += valY;
    F[nodeIdx * 3 + 2] += valM;

    directNodalF[nodeIdx * 3] += valX;
    directNodalF[nodeIdx * 3 + 1] += valY;
    directNodalF[nodeIdx * 3 + 2] += valM;
  });

  // 3. Member Equivalent Nodal Loads (Fixed-End Forces)
  loads.filter(l => l.barId).forEach(l => {
    const bar = bars.find(b => b.id === l.barId);
    if (!bar) return;
    const details = barDetailedData.get(bar.id);
    if (!details) return;

    const { L, cos: c, sin: s } = details;
    const fef = new Float64Array(6).fill(0); // [N1, V1, M1, N2, V2, M2] exerted BY RESTRAINTS ON MEMBER

    if (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL) {
      let Pp = l.valuePerpendicular !== undefined ? l.valuePerpendicular : (l.valueY || 0); // Transverse (perp to bar, positive +y' local)
      let Pa = l.valueNormal || 0;        // Axial (positive +x' local)

      if (l.type === FrameLoadType.POINT_GLOBAL) {
        const Px = l.valueX || 0;
        const Py = l.valueY || 0;
        Pp = -Px * s + Py * c;
        Pa = Px * c + Py * s;
      }

      const a = Math.max(0, Math.min(L, l.position !== undefined ? l.position : L / 2));
      const b = L - a;

      // Fixed-end reactions
      fef[0] = -(Pa * b) / L;
      fef[3] = -(Pa * a) / L;

      fef[1] = -(Pp * b * b * (3 * a + b)) / (L * L * L);
      fef[4] = -(Pp * a * a * (3 * b + a)) / (L * L * L);
      fef[2] = -(Pp * a * b * b) / (L * L);
      fef[5] = (Pp * a * a * b) / (L * L);
    } else if (l.type === FrameLoadType.DISTRIBUTED_LOCAL || l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
      let wp = l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || 0); // kN/m transverse
      let wa = l.valueNormal || 0;        // kN/m axial

      if (l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
        let wx = l.valueX || 0;
        let wy = l.valueY || 0;

        // In structural engineering, global distributed loads are defined per unit of projected length:
        // Global Y (gravity/snow/roof) -> per meter of horizontal projection (|cos|), resulting in total Q = q * deltaX
        // Global X (wind/soil on face) -> per meter of vertical projection (|sin|), resulting in total Q = q * deltaY
        const isProj = l.isProjected !== false;
        if (isProj) {
          if (wy !== 0) wy = wy * Math.abs(c);
          if (wx !== 0) wx = wx * Math.abs(s);
        }

        wp = -wx * s + wy * c;
        wa = wx * c + wy * s;
      }

      const a = Math.max(0, Math.min(L, l.position !== undefined ? l.position : 0));
      const b = Math.max(a, Math.min(L, l.endPosition !== undefined ? l.endPosition : L));

      if (b > a) {
        // Closed-form Fixed-End Moments & Shears for partial uniform load w from a to b
        const a2 = a * a;
        const a3 = a2 * a;
        const a4 = a3 * a;
        const b2 = b * b;
        const b3 = b2 * b;
        const b4 = b3 * b;
        const L2 = L * L;

        const M1 = -(wp / L2) * ((L2 * (b2 - a2)) / 2 - (2 * L * (b3 - a3)) / 3 + (b4 - a4) / 4);
        const M2 = (wp / L2) * ((L * (b3 - a3)) / 3 - (b4 - a4) / 4);

        const momentIntegral = wp * (L * (b - a) - (b2 - a2) / 2);
        const V1 = -(1 / L) * (M1 + M2 + momentIntegral);
        const V2 = -wp * (b - a) - V1;

        const N1 = -wa * ((b - a) - (b2 - a2) / (2 * L));
        const N2 = -wa * ((b2 - a2) / (2 * L));

        fef[0] = N1;
        fef[1] = V1;
        fef[2] = M1;
        fef[3] = N2;
        fef[4] = V2;
        fef[5] = M2;
      }
    }

    // Member Hinge Adjustments to Fixed-End Moments
    if (bar.hasStartHinge && bar.hasEndHinge) {
      fef[1] = fef[1] - fef[2] / L + fef[5] / L;
      fef[4] = fef[4] + fef[2] / L - fef[5] / L;
      fef[2] = 0;
      fef[5] = 0;
    } else if (bar.hasStartHinge) {
      fef[4] = fef[4] - (1.5 * fef[2]) / L;
      fef[1] = fef[1] + (1.5 * fef[2]) / L;
      fef[5] = fef[5] - 0.5 * fef[2];
      fef[2] = 0;
    } else if (bar.hasEndHinge) {
      fef[1] = fef[1] + (1.5 * fef[5]) / L;
      fef[4] = fef[4] - (1.5 * fef[5]) / L;
      fef[2] = fef[2] - 0.5 * fef[5];
      fef[5] = 0;
    }

    // Accumulate in bar fixed-end forces
    for (let i = 0; i < 6; i++) {
      details.fefLocal[i] += fef[i];
    }

    // Equivalent Nodal Load Vector = - T^T * fefLocal
    const fefGlobal = multiplyVec(transpose(details.T), Array.from(fef));
    const startIdx = nodeMap.get(bar.startNodeId)!;
    const endIdx = nodeMap.get(bar.endNodeId)!;
    const idxs = [
      startIdx * 3, startIdx * 3 + 1, startIdx * 3 + 2,
      endIdx * 3, endIdx * 3 + 1, endIdx * 3 + 2
    ];

    for (let i = 0; i < 6; i++) {
      const val = -fefGlobal[i];
      F[idxs[i]] += val;
      equivNodalF[idxs[i]] += val;
    }
  });

  // 4. Boundary Conditions (Supports)
  const constrainedDOFs = new Set<number>();
  supports.forEach(s => {
    const nodeIdx = nodeMap.get(s.nodeId);
    if (nodeIdx === undefined) return;

    if (s.type === FrameSupportType.FIXED) {
      constrainedDOFs.add(nodeIdx * 3);     // Restrain Ux
      constrainedDOFs.add(nodeIdx * 3 + 1); // Restrain Uy
      constrainedDOFs.add(nodeIdx * 3 + 2); // Restrain Rz
    } else if (s.type === FrameSupportType.PINNED) {
      constrainedDOFs.add(nodeIdx * 3);     // Restrain Ux
      constrainedDOFs.add(nodeIdx * 3 + 1); // Restrain Uy
    } else if (s.type === FrameSupportType.ROLLER_Y) {
      constrainedDOFs.add(nodeIdx * 3 + 1); // Restrain Uy (Roller moves in X)
    } else if (s.type === FrameSupportType.ROLLER_X) {
      constrainedDOFs.add(nodeIdx * 3);     // Restrain Ux (Roller moves in Y)
    }
  });

  // 5. Solve Reduced Linear System
  const activeDOFs = Array.from({ length: totalDOF }, (_, i) => i).filter(i => !constrainedDOFs.has(i));
  const nActive = activeDOFs.length;

  if (nActive === 0 && supports.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Estrutura hipostática sem apoios. Adicione apoios para restringir a estrutura.',
      reactions: [],
      barResults: [],
      nodeDisplacements: [],
      isHyperstatic: false,
      degreeOfFreedom: 0,
      totalNodes: nodes.length,
      totalBars: bars.length,
      equilibriumCheck: { sumFx: 0, sumFy: 0, sumMz: 0, isBalanced: false },
      steps: []
    };
  }

  const Kred = Array.from({ length: nActive }, () => new Float64Array(nActive).fill(0));
  const Fred = new Float64Array(nActive).fill(0);

  for (let i = 0; i < nActive; i++) {
    Fred[i] = F[activeDOFs[i]];
    for (let j = 0; j < nActive; j++) {
      Kred[i][j] = K[activeDOFs[i]][activeDOFs[j]];
    }
  }

  let Ured: number[] = [];
  try {
    Ured = solveGaussian(Kred.map(row => Array.from(row)), Array.from(Fred));
  } catch (err: any) {
    return {
      isValid: false,
      errorMessage: 'Estrutura instável ou hipostática (mecanismo / determinante nulo). Verifique a vinculação dos apoios e rótulas.',
      reactions: [],
      barResults: [],
      nodeDisplacements: [],
      isHyperstatic: false,
      degreeOfFreedom: nActive,
      totalNodes: nodes.length,
      totalBars: bars.length,
      equilibriumCheck: { sumFx: 0, sumFy: 0, sumMz: 0, isBalanced: false },
      steps: []
    };
  }

  const U = new Float64Array(totalDOF).fill(0);
  activeDOFs.forEach((dof, i) => {
    U[dof] = isNaN(Ured[i]) ? 0 : Ured[i];
  });

  // 6. Post-Processing: Support Reactions
  // {R} = [K_global] {U} - {F_direct_nodal} - {F_equiv_nodal}
  const KU = multiplyVec(K.map(row => Array.from(row)), Array.from(U));
  const reactions: ReactionResult[] = [];

  supports.forEach(s => {
    const nodeIdx = nodeMap.get(s.nodeId);
    if (nodeIdx === undefined) return;
    const baseIdx = nodeIdx * 3;

    const rx = KU[baseIdx] - directNodalF[baseIdx] - equivNodalF[baseIdx];
    const ry = KU[baseIdx + 1] - directNodalF[baseIdx + 1] - equivNodalF[baseIdx + 1];
    const rm = KU[baseIdx + 2] - directNodalF[baseIdx + 2] - equivNodalF[baseIdx + 2];

    reactions.push({
      nodeId: s.nodeId,
      fx: parseFloat(rx.toFixed(3)),
      fy: parseFloat(ry.toFixed(3)),
      mz: parseFloat(rm.toFixed(3))
    });
  });

  // 7. Node Displacements in mm and rad
  const nodeDisplacements: NodeDisplacement[] = nodes.map((node, i) => {
    const dxMeters = U[i * 3];
    const dyMeters = U[i * 3 + 1];
    const rotRad = U[i * 3 + 2];
    return {
      nodeId: node.id,
      dx: parseFloat((dxMeters * 1000).toFixed(4)), // mm
      dy: parseFloat((dyMeters * 1000).toFixed(4)), // mm
      rotZ: parseFloat(rotRad.toFixed(6)), // rad
      rotZDeg: parseFloat(((rotRad * 180) / Math.PI).toFixed(4)) // deg
    };
  });

  // 8. Member Internal Forces & Diagrams along each bar
  const barResults: BarResult[] = [];

  bars.forEach(bar => {
    const startIdx = nodeMap.get(bar.startNodeId)!;
    const endIdx = nodeMap.get(bar.endNodeId)!;
    const n1 = nodes[startIdx];
    const n2 = nodes[endIdx];
    const details = barDetailedData.get(bar.id)!;
    const { L, cos: c, sin: s, kLocal, T, fefLocal } = details;

    const uGlob = [
      U[startIdx * 3], U[startIdx * 3 + 1], U[startIdx * 3 + 2],
      U[endIdx * 3], U[endIdx * 3 + 1], U[endIdx * 3 + 2]
    ];

    const uLoc = multiplyVec(T, uGlob);

    // End actions on member in local coordinates: f = k_local * u_local + fef_local
    const forcesFromDispl = multiplyVec(kLocal, uLoc);
    const fNodeOnMember = forcesFromDispl.map((f, i) => f + fefLocal[i]);

    // Initial section values at x = 0 (Convention: N>0 tension, V>0 shear left-up, M>0 bottom tension)
    const N1 = -fNodeOnMember[0]; // Tension positive
    const V1 = fNodeOnMember[1];   // Shear positive
    const M1 = -fNodeOnMember[2];  // Moment positive for bottom tension

    // Sample along the member length
    const numPoints = 51;
    const points: InternalEfforts[] = [];

    // Angle in degrees for display
    let angleRad = Math.atan2(n2.y - n1.y, n2.x - n1.x);
    let angleDeg = (angleRad * 180) / Math.PI;

    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * L;
      let Nx = N1;
      let Vx = V1;
      let Mx = M1 + V1 * x;

      // Integrate member loads
      loads.filter(l => l.barId === bar.id).forEach(l => {
        let wp = l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || 0);
        let wa = l.valueNormal || 0;

        if (l.type === FrameLoadType.POINT_GLOBAL || l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
          let lx = l.valueX || 0;
          let ly = l.valueY || 0;

          const isProj = l.isProjected !== false;
          if (isProj && l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
            if (ly !== 0) ly = ly * Math.abs(c);
            if (lx !== 0) lx = lx * Math.abs(s);
          }

          wp = -lx * s + ly * c;
          wa = lx * c + ly * s;
        }

        if (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL) {
          const a = l.position !== undefined ? l.position : L / 2;
          if (x >= a) {
            Nx -= wa;
            Vx += wp;
            Mx += wp * (x - a);
          }
        } else if (l.type === FrameLoadType.DISTRIBUTED_LOCAL || l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
          const a = Math.max(0, Math.min(L, l.position !== undefined ? l.position : 0));
          const b = Math.max(a, Math.min(L, l.endPosition !== undefined ? l.endPosition : L));

          if (x > a && b > a) {
            if (x <= b) {
              const dxLoad = x - a;
              Nx -= wa * dxLoad;
              Vx += wp * dxLoad;
              Mx += (wp * dxLoad * dxLoad) / 2;
            } else {
              const lenLoad = b - a;
              Nx -= wa * lenLoad;
              Vx += wp * lenLoad;
              Mx += wp * lenLoad * (x - (a + b) / 2);
            }
          }
        }
      });

      // Transverse deflection shape estimation for visualization (Hermite cubic interpolation)
      const xi = x / L;
      const h1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
      const h2 = x * (1 - xi) * (1 - xi);
      const h3 = 3 * xi * xi - 2 * xi * xi * xi;
      const h4 = x * (xi * xi - xi);
      const vTrans = h1 * uLoc[1] + h2 * uLoc[2] + h3 * uLoc[4] + h4 * uLoc[5];
      const uAxial = (1 - xi) * uLoc[0] + xi * uLoc[3];

      // Global position of deformed point
      const xGlobalUndef = n1.x + x * c;
      const yGlobalUndef = n1.y + x * s;
      const dxGlob = uAxial * c - vTrans * s;
      const dyGlob = uAxial * s + vTrans * c;

      points.push({
        x: parseFloat(x.toFixed(4)),
        n: parseFloat(Nx.toFixed(3)),
        v: parseFloat(Vx.toFixed(3)),
        m: parseFloat(Mx.toFixed(3)),
        deflection: parseFloat((vTrans * 1000).toFixed(4)),
        dxGlobal: xGlobalUndef + dxGlob,
        dyGlobal: yGlobalUndef + dyGlob
      });
    }

    // Extremes
    let maxN = points[0].n, minN = points[0].n, maxNx = 0, minNx = 0;
    let maxV = points[0].v, minV = points[0].v, maxVx = 0, minVx = 0;
    let maxM = points[0].m, minM = points[0].m, maxMx = 0, minMx = 0;

    points.forEach(p => {
      if (p.n > maxN) { maxN = p.n; maxNx = p.x; }
      if (p.n < minN) { minN = p.n; minNx = p.x; }
      if (p.v > maxV) { maxV = p.v; maxVx = p.x; }
      if (p.v < minV) { minV = p.v; minVx = p.x; }
      if (p.m > maxM) { maxM = p.m; maxMx = p.x; }
      if (p.m < minM) { minM = p.m; minMx = p.x; }
    });

    barResults.push({
      barId: bar.id,
      length: parseFloat(L.toFixed(3)),
      angleDeg: parseFloat(angleDeg.toFixed(2)),
      points,
      startNodeEfforts: { n: points[0].n, v: points[0].v, m: points[0].m },
      endNodeEfforts: { n: points[points.length - 1].n, v: points[points.length - 1].v, m: points[points.length - 1].m },
      maxNormal: { val: maxN, x: maxNx },
      minNormal: { val: minN, x: minNx },
      maxShear: { val: maxV, x: maxVx },
      minShear: { val: minV, x: minVx },
      maxMoment: { val: maxM, x: maxMx },
      minMoment: { val: minM, x: minMx },
      localDisplacements: uLoc,
      localKMatrix: kLocal,
      globalKMatrix: details.kGlobal,
      transMatrix: T
    });
  });

  // 9. Equilibrium Verification Check
  let totalAppliedFx = 0;
  let totalAppliedFy = 0;
  let totalAppliedMz = 0;

  loads.forEach(l => {
    if (l.nodeId) {
      const node = nodes.find(n => n.id === l.nodeId);
      if (node) {
        const fx = l.valueX || 0;
        const fy = l.valueY || 0;
        const mz = l.valueMoment || 0;
        totalAppliedFx += fx;
        totalAppliedFy += fy;
        totalAppliedMz += mz + (node.x * fy - node.y * fx);
      }
    } else if (l.barId) {
      const bar = bars.find(b => b.id === l.barId);
      if (bar) {
        const n1 = nodes.find(n => n.id === bar.startNodeId)!;
        const n2 = nodes.find(n => n.id === bar.endNodeId)!;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const L = Math.sqrt(dx * dx + dy * dy);
        const c = dx / L;
        const s = dy / L;

        const a = Math.max(0, Math.min(L, l.position !== undefined ? l.position : 0));
        const b = Math.max(a, Math.min(L, l.endPosition !== undefined ? l.endPosition : L));
        const loadedLen = b - a;
        const midPos = (a + b) / 2;
        const midX = n1.x + midPos * c;
        const midY = n1.y + midPos * s;

        if (l.type === FrameLoadType.DISTRIBUTED_GLOBAL) {
          const isProj = l.isProjected !== false;
          // If projected: totalFx = wx * deltaY_loaded, totalFy = wy * deltaX_loaded
          const totalFx = (l.valueX || 0) * (isProj ? Math.abs(s) * loadedLen : loadedLen);
          const totalFy = (l.valueY || 0) * (isProj ? Math.abs(c) * loadedLen : loadedLen);
          totalAppliedFx += totalFx;
          totalAppliedFy += totalFy;
          totalAppliedMz += midX * totalFy - midY * totalFx;
        } else if (l.type === FrameLoadType.DISTRIBUTED_LOCAL) {
          const vp = l.valuePerpendicular || 0;
          const vn = l.valueNormal || 0;
          const globX = (vn * c - vp * s) * loadedLen;
          const globY = (vn * s + vp * c) * loadedLen;
          totalAppliedFx += globX;
          totalAppliedFy += globY;
          totalAppliedMz += midX * globY - midY * globX;
        } else if (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL) {
          let gx = l.valueX || 0;
          let gy = l.valueY || 0;
          if (l.type === FrameLoadType.POINT_LOCAL) {
            const vp = l.valuePerpendicular || 0;
            const vn = l.valueNormal || 0;
            gx = vn * c - vp * s;
            gy = vn * s + vp * c;
          }
          const ptPos = l.position !== undefined ? l.position : L / 2;
          const posX = n1.x + ptPos * c;
          const posY = n1.y + ptPos * s;
          totalAppliedFx += gx;
          totalAppliedFy += gy;
          totalAppliedMz += posX * gy - posY * gx;
        }
      }
    }
  });

  let sumRx = 0, sumRy = 0, sumRMz = 0;
  reactions.forEach(r => {
    const node = nodes.find(n => n.id === r.nodeId);
    if (node) {
      sumRx += r.fx;
      sumRy += r.fy;
      sumRMz += r.mz + (node.x * r.fy - node.y * r.fx);
    }
  });

  const eqFx = totalAppliedFx + sumRx;
  const eqFy = totalAppliedFy + sumRy;
  const eqMz = totalAppliedMz + sumRMz;

  const isBalanced = Math.abs(eqFx) < 0.05 && Math.abs(eqFy) < 0.05 && Math.abs(eqMz) < 0.1;

  // Degrees of freedom & Hyperstaticity assessment
  const totalConstraints = constrainedDOFs.size;
  const numReleases = bars.filter(b => b.hasStartHinge).length + bars.filter(b => b.hasEndHinge).length;
  const isHyperstatic = totalConstraints - numReleases > 3;

  // 10. Educational step-by-step calculation log
  const dofLabels: string[] = [];
  nodes.forEach(n => {
    dofLabels.push(`U_${n.id}x`, `U_${n.id}y`, `θ_${n.id}z`);
  });

  const steps: StiffnessStepDetail[] = [
    {
      title: '1. Discretização e Graus de Liberdade',
      description: `Estrutura modelada com ${nodes.length} nós e ${bars.length} barras. Cada nó possui 3 graus de liberdade no plano (Dx, Dy, Rz). Total de ${totalDOF} graus de liberdade globais, sendo ${constrainedDOFs.size} restritos por apoios e ${activeDOFs.length} livres.`
    },
    {
      title: '2. Matrizes de Rigidez Locais e Globais dos Elementos',
      description: `Para cada barra com comprimento L e orientação θ, foram formuladas as matrizes de rigidez local [k_loc] (6x6) considerando elasticidade E=${(E/1e6).toFixed(0)} GPa, seção A=${(A*1e4).toFixed(0)} cm² e inércia I=${(I*1e8).toFixed(0)} cm⁴, aplicando rotação de coordenadas [T] para acoplamento global.`
    },
    {
      title: '3. Vetor de Forças Nodais Equivalentes e Ações Fixas',
      description: `Cargas distribuídas e concentradas ao longo dos vãos foram convertidas em forças de engastamento perfeito e transferidas como ações nodais equivalentes no vetor de carregamento global.`
    },
    {
      title: '4. Resolução do Sistema [K_red] {U} = {F_red}',
      description: `Aplicação das condições de contorno e resolução do sistema linear de equações pelo método de eliminação de Gauss com pivoteamento para obtenção dos deslocamentos e rotações nodais.`
    },
    {
      title: '5. Verificação de Equilíbrio Global',
      description: `Somatório de Forças Horizontais: ΣFx = ${eqFx.toFixed(3)} kN | Verticais: ΣFy = ${eqFy.toFixed(3)} kN | Momentos em relação à origem: ΣM = ${eqMz.toFixed(3)} kNm. Status: ${isBalanced ? 'Equilíbrio Satisfeito com Sucesso!' : 'Atenção aos vínculos'}`
    }
  ];

  return {
    isValid: true,
    reactions,
    barResults,
    nodeDisplacements,
    isHyperstatic,
    degreeOfFreedom: nActive,
    totalNodes: nodes.length,
    totalBars: bars.length,
    equilibriumCheck: {
      sumFx: parseFloat(eqFx.toFixed(3)),
      sumFy: parseFloat(eqFy.toFixed(3)),
      sumMz: parseFloat(eqMz.toFixed(3)),
      isBalanced
    },
    globalMatrixPreview: {
      size: totalDOF,
      matrix: K.slice(0, Math.min(12, totalDOF)).map(row => Array.from(row.slice(0, Math.min(12, totalDOF)))),
      loadVector: Array.from(F.slice(0, Math.min(12, totalDOF))),
      displacementVector: Array.from(U.slice(0, Math.min(12, totalDOF))),
      dofLabels: dofLabels.slice(0, Math.min(12, totalDOF))
    },
    steps
  };
}

// Matrix helper methods
function multiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const C = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const AT = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      AT[j][i] = A[i][j];
    }
  }
  return AT;
}

function multiplyVec(A: number[][], b: number[]): number[] {
  const rows = A.length;
  const cols = A[0].length;
  const c = new Array(rows).fill(0);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      sum += A[i][j] * b[j];
    }
    c[i] = sum;
  }
  return c;
}

function solveGaussian(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (n === 0) return [];

  // Deep clone
  const M = A.map(row => [...row]);
  const rhs = [...b];

  for (let i = 0; i < n; i++) {
    // Pivot selection
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      const val = Math.abs(M[k][i]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = k;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error('Matriz singular ou quase-singular (estrutura instável).');
    }

    if (maxRow !== i) {
      const tempRow = M[i];
      M[i] = M[maxRow];
      M[maxRow] = tempRow;

      const tempVal = rhs[i];
      rhs[i] = rhs[maxRow];
      rhs[maxRow] = tempVal;
    }

    // Elimination
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      rhs[k] -= factor * rhs[i];
      for (let j = i; j < n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = rhs[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / M[i][i];
  }

  return x;
}
