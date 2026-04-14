import { BeamData, BeamLoad, BeamSupport, LoadType, SupportType } from '../types';

export interface DiagramPoint {
  x: number;
  shear: number;
  moment: number;
}

export interface BeamAnalysisResult {
  points: DiagramPoint[];
  reactions: { position: number; value: number; type: 'FORCE' | 'MOMENT' }[];
  maxShear: number;
  minShear: number;
  maxMoment: number;
  minMoment: number;
  zeroCrossings: {
    shear: number[];
    moment: number[];
  };
}

export function analyzeBeam(beam: BeamData): BeamAnalysisResult {
  const { length, supports, loads } = beam;
  
  // 1. Define nodes
  // We need nodes at start, end, supports, hinges, and load points
  const nodePositions = new Set<number>([0, length]);
  supports.forEach(s => nodePositions.add(s.position));
  loads.forEach(l => {
    nodePositions.add(l.position);
    if (l.type === LoadType.DISTRIBUTED && l.endPosition !== undefined) {
      nodePositions.add(l.endPosition);
    }
  });
  
  const sortedNodes = Array.from(nodePositions).sort((a, b) => a - b);
  
  // Refine nodes for smoother diagrams
  const finalNodes: number[] = [];
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    finalNodes.push(sortedNodes[i]);
    const dist = sortedNodes[i+1] - sortedNodes[i];
    const subDivs = Math.max(1, Math.floor(dist / (length / 50)));
    for (let j = 1; j < subDivs; j++) {
      finalNodes.push(sortedNodes[i] + (j * dist) / subDivs);
    }
  }
  finalNodes.push(length);

  const nNodes = finalNodes.length;
  
  // 2. Assign DOFs
  // Each node has 2 DOFs: displacement (v) and rotation (theta)
  // Hinges: A hinge at a node means the rotation is independent for left and right elements.
  // To handle hinges, we'll "double" the rotation DOF at hinge nodes.
  
  const nodeDofs: { v: number; thetaL: number; thetaR: number }[] = [];
  let dofCount = 0;
  
  for (let i = 0; i < nNodes; i++) {
    const pos = finalNodes[i];
    const isHinge = supports.some(s => s.position === pos && s.type === SupportType.HINGE);
    
    const v = dofCount++;
    const thetaL = dofCount++;
    let thetaR = thetaL;
    
    if (isHinge) {
      thetaR = dofCount++;
    }
    
    nodeDofs.push({ v, thetaL, thetaR });
  }

  // 3. Assemble Global Stiffness Matrix and Load Vector
  const K_orig = Array.from({ length: dofCount }, () => new Array(dofCount).fill(0));
  const F_ext = new Array(dofCount).fill(0);
  const EI = 10000; // Arbitrary constant EI

  for (let i = 0; i < nNodes - 1; i++) {
    const L = finalNodes[i+1] - finalNodes[i];
    if (L <= 0) continue;

    const dofs = [
      nodeDofs[i].v, nodeDofs[i].thetaR,
      nodeDofs[i+1].v, nodeDofs[i+1].thetaL
    ];

    const kLocal = [
      [12, 6*L, -12, 6*L],
      [6*L, 4*L*L, -6*L, 2*L*L],
      [-12, -6*L, 12, -6*L],
      [6*L, 2*L*L, -6*L, 4*L*L]
    ].map(row => row.map(val => val * EI / (L*L*L)));

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        K_orig[dofs[r]][dofs[c]] += kLocal[r][c];
      }
    }
  }

  // 4. Apply Loads
  loads.forEach(load => {
    if (load.type === LoadType.CONCENTRATED) {
      const nodeIdx = finalNodes.findIndex(p => Math.abs(p - load.position) < 0.0001);
      if (nodeIdx !== -1) {
        F_ext[nodeDofs[nodeIdx].v] -= load.value;
      }
    } else if (load.type === LoadType.MOMENT) {
      const nodeIdx = finalNodes.findIndex(p => Math.abs(p - load.position) < 0.0001);
      if (nodeIdx !== -1) {
        F_ext[nodeDofs[nodeIdx].thetaL] -= load.value;
        if (nodeDofs[nodeIdx].thetaL !== nodeDofs[nodeIdx].thetaR) {
          F_ext[nodeDofs[nodeIdx].thetaR] -= load.value;
        }
      }
    } else if (load.type === LoadType.DISTRIBUTED) {
      const start = load.position;
      const end = load.endPosition || start;
      const qStart = load.value;
      const qEnd = load.endValue ?? qStart;

      for (let i = 0; i < nNodes - 1; i++) {
        const n1 = finalNodes[i];
        const n2 = finalNodes[i+1];
        if (n2 <= start || n1 >= end) continue;

        const x1 = Math.max(n1, start);
        const x2 = Math.min(n2, end);
        const L_elem = n2 - n1;
        const L_load = x2 - x1;
        if (L_load <= 0) continue;

        const q1 = qStart + (qEnd - qStart) * ((x1 - start) / (end - start));
        const q2 = qStart + (qEnd - qStart) * ((x2 - start) / (end - start));

        const L = L_elem;
        const V1 = (L / 20) * (7 * q1 + 3 * q2);
        const M1 = (L * L / 60) * (3 * q1 + 2 * q2);
        const V2 = (L / 20) * (3 * q1 + 7 * q2);
        const M2 = -(L * L / 60) * (2 * q1 + 3 * q2);

        F_ext[nodeDofs[i].v] -= V1;
        F_ext[nodeDofs[i].thetaR] -= M1;
        F_ext[nodeDofs[i+1].v] -= V2;
        F_ext[nodeDofs[i+1].thetaL] -= M2;
      }
    }
  });

  // 5. Apply Boundary Conditions (Supports)
  const K = K_orig.map(row => [...row]);
  const F = [...F_ext];
  const fixedDofs = new Set<number>();
  supports.forEach(s => {
    const nodeIdx = finalNodes.findIndex(p => Math.abs(p - s.position) < 0.0001);
    if (nodeIdx === -1) return;

    if (s.type === SupportType.PINNED || s.type === SupportType.ROLLER) {
      fixedDofs.add(nodeDofs[nodeIdx].v);
    } else if (s.type === SupportType.FIXED) {
      fixedDofs.add(nodeDofs[nodeIdx].v);
      fixedDofs.add(nodeDofs[nodeIdx].thetaL);
      fixedDofs.add(nodeDofs[nodeIdx].thetaR);
    }
  });

  // Row-elimination method for exact boundary conditions
  fixedDofs.forEach(dof => {
    K[dof].fill(0);
    K[dof][dof] = 1;
    F[dof] = 0;
  });

  // 6. Solve System
  const displacements = solveLinearSystem(K, F);

  // 7. Calculate Reactions: R = K_orig * v - F_ext
  const R_total = new Array(dofCount).fill(0);
  for (let i = 0; i < dofCount; i++) {
    let sum = 0;
    for (let j = 0; j < dofCount; j++) {
      sum += K_orig[i][j] * displacements[j];
    }
    R_total[i] = sum - F_ext[i];
  }

  const reactions: { position: number; value: number; type: 'FORCE' | 'MOMENT' }[] = [];
  for (let i = 0; i < nNodes; i++) {
    const isSupport = supports.some(s => Math.abs(s.position - finalNodes[i]) < 0.0001);
    if (isSupport) {
      const vDof = nodeDofs[i].v;
      const reactionForce = R_total[vDof];
      if (Math.abs(reactionForce) > 0.0001) {
        reactions.push({ position: finalNodes[i], value: reactionForce, type: 'FORCE' });
      }
      
      const s = supports.find(s => Math.abs(s.position - finalNodes[i]) < 0.0001);
      if (s?.type === SupportType.FIXED) {
        const mReaction = R_total[nodeDofs[i].thetaL];
        if (Math.abs(mReaction) > 0.0001) {
          reactions.push({ position: finalNodes[i], value: mReaction, type: 'MOMENT' });
        }
      }
    }
  }

  // 8. Calculate Internal Forces using Integration Method (Method of Sections)
  const calculateAtX = (x: number): DiagramPoint => {
    let V = 0;
    let M = 0;

    // Add reactions to the left of x
    reactions.forEach(r => {
      if (r.position <= x + 0.000001) {
        if (r.type === 'FORCE') {
          V += r.value;
          M += r.value * (x - r.position);
        } else {
          M += r.value;
        }
      }
    });

    // Subtract loads to the left of x
    loads.forEach(l => {
      if (l.type === LoadType.CONCENTRATED) {
        if (l.position <= x + 0.000001) {
          V -= l.value;
          M -= l.value * (x - l.position);
        }
      } else if (l.type === LoadType.MOMENT) {
        if (l.position <= x + 0.000001) {
          M += l.value;
        }
      } else if (l.type === LoadType.DISTRIBUTED) {
        const start = l.position;
        const end = l.endPosition || start;
        if (start < x) {
          const x_load = Math.min(x, end);
          const L_load = x_load - start;
          const q1 = l.value;
          const q2 = l.endValue ?? q1;
          
          const q_at_x = q1 + (q2 - q1) * ((x_load - start) / (end - start));
          const totalP = ((q1 + q_at_x) / 2) * L_load;
          
          // Moment contribution using direct integration to avoid division by zero
          // M = integral(q(s) * (x - s) ds) = totalP * (x - start) - L^2 * (q1 + 2*q_at_x) / 6
          const momentContrib = totalP * (x - start) - (L_load * L_load * (q1 + 2 * q_at_x)) / 6;
          
          V -= totalP;
          M -= momentContrib;
        }
      }
    });

    if (Math.abs(V) < 0.000001) V = 0;
    if (Math.abs(M) < 0.000001) M = 0;

    return { x: Number(x.toFixed(6)), shear: V, moment: M };
  };

  const initialPoints: DiagramPoint[] = [];
  const nPoints = Math.min(1000, Math.ceil(length * 100)); // Cap points to 1000 for performance
  const sampleX = new Set<number>();
  finalNodes.forEach(n => {
    sampleX.add(Number(n.toFixed(6)));
    if (n > 0) sampleX.add(Number((n - 0.00001).toFixed(6)));
    if (n < length) sampleX.add(Number((n + 0.00001).toFixed(6)));
  });
  for (let i = 0; i <= nPoints; i++) {
    sampleX.add(Number(((i / nPoints) * length).toFixed(6)));
  }
  
  Array.from(sampleX).sort((a, b) => a - b).forEach(x => {
    initialPoints.push(calculateAtX(x));
  });

  // Find zero crossings
  const zeroCrossings = {
    shear: [] as number[],
    moment: [] as number[]
  };

  const findCrossings = (data: number[], points: DiagramPoint[]) => {
    const crossings: number[] = [];
    for (let i = 0; i < data.length - 1; i++) {
      const v1 = data[i];
      const v2 = data[i+1];
      const x1 = points[i].x;
      const x2 = points[i+1].x;

      if ((v1 > 0 && v2 < 0) || (v1 < 0 && v2 > 0)) {
        const t = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2));
        const xZero = x1 + t * (x2 - x1);
        crossings.push(Number(xZero.toFixed(6)));
      } else if (Math.abs(v1) < 1e-6 && (i === 0 || Math.abs(data[i-1]) >= 1e-6)) {
        // Only push the start of a zero segment
        crossings.push(x1);
      }
    }
    // Deduplicate points that are very close (within 1cm)
    return crossings.filter((x, idx, self) => 
      self.findIndex(val => Math.abs(val - x) < 0.01) === idx
    );
  };

  zeroCrossings.shear = findCrossings(initialPoints.map(p => p.shear), initialPoints);
  zeroCrossings.moment = findCrossings(initialPoints.map(p => p.moment), initialPoints);

  // Re-generate points including exact zero crossings
  const finalSampleX = new Set(sampleX);
  zeroCrossings.shear.forEach(x => finalSampleX.add(x));
  zeroCrossings.moment.forEach(x => finalSampleX.add(x));

  const points: DiagramPoint[] = Array.from(finalSampleX)
    .sort((a, b) => a - b)
    .map(x => calculateAtX(x));

  const shears = points.map(p => p.shear);
  const moments = points.map(p => p.moment);

  return {
    points,
    reactions,
    maxShear: Math.max(...shears),
    minShear: Math.min(...shears),
    maxMoment: Math.max(...moments),
    minMoment: Math.min(...moments),
    zeroCrossings
  };
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const x = new Array(n).fill(0);
  
  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
    }
    
    [A[i], A[max]] = [A[max], A[i]];
    [b[i], b[max]] = [b[max], b[i]];
    
    if (Math.abs(A[i][i]) < 1e-18) continue;
    
    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / A[i][i];
      b[j] -= factor * b[i];
      for (let k = i; k < n; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }
  
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-18) continue;
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    x[i] = (b[i] - sum) / A[i][i];
  }
  
  return x;
}
