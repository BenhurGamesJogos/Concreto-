import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Info, 
  ArrowDown, 
  ArrowRight,
  MoveHorizontal, 
  RotateCw, 
  GripVertical, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Maximize2, 
  Sliders, 
  Sparkles, 
  FileText,
  Table as TableIcon,
  Activity,
  Compass,
  CornerDownRight,
  Share2,
  Copy,
  Download,
  Upload,
  Code2,
  Check,
  X,
  FileJson,
  Link2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { FrameData, FrameNode, FrameBar, FrameSupport, FrameLoad, FrameSupportType, FrameLoadType, User, UserRole } from '../../types';
import { analyzeFrame, FrameAnalysisResult } from '../../utils/frameCalculator';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const supportLabels: Record<FrameSupportType, string> = {
  [FrameSupportType.FIXED]: 'Engaste',
  [FrameSupportType.PINNED]: 'Apoio Fixo',
  [FrameSupportType.ROLLER_Y]: 'Móvel Y',
  [FrameSupportType.ROLLER_X]: 'Móvel X',
};

// --- CODE ENCODER & DECODER ---
export const encodeFrameCode = (frameData: FrameData): string => {
  try {
    const payload = {
      v: 1,
      name: 'Portico Estrutural',
      createdAt: new Date().toISOString(),
      nodes: frameData.nodes,
      bars: frameData.bars,
      supports: frameData.supports,
      loads: frameData.loads,
      considerAxialDeformation: frameData.considerAxialDeformation ?? false,
      considerShearDeformation: frameData.considerShearDeformation ?? false
    };
    const jsonStr = JSON.stringify(payload);
    // Base64 UTF-8 safe encoding
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    return `PORTICO-${encoded}`;
  } catch (err) {
    console.error('Error encoding frame', err);
    return '';
  }
};

export const decodeFrameCode = (code: string): FrameData | null => {
  try {
    let cleanCode = code.trim();
    if (cleanCode.startsWith('PORTICO-')) {
      cleanCode = cleanCode.substring('PORTICO-'.length);
    }
    // Also support raw JSON if user pasted raw JSON
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      const parsed = JSON.parse(cleanCode);
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.bars)) {
        return {
          nodes: parsed.nodes || [],
          bars: parsed.bars || [],
          supports: parsed.supports || [],
          loads: parsed.loads || [],
          considerAxialDeformation: parsed.considerAxialDeformation ?? false,
          considerShearDeformation: parsed.considerShearDeformation ?? false
        };
      }
    }

    const decodedStr = decodeURIComponent(
      Array.prototype.map.call(atob(cleanCode), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const parsed = JSON.parse(decodedStr);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.bars)) {
      return {
        nodes: parsed.nodes || [],
        bars: parsed.bars || [],
        supports: parsed.supports || [],
        loads: parsed.loads || [],
        considerAxialDeformation: parsed.considerAxialDeformation ?? false,
        considerShearDeformation: parsed.considerShearDeformation ?? false
      };
    }
    return null;
  } catch (err) {
    console.error('Error decoding frame code', err);
    return null;
  }
};

// --- PRESETS ---
const PRESETS: { name: string; description: string; data: FrameData }[] = [
  {
    name: 'Pórtico Simples com Vento',
    description: 'Pórtico retangular com carga vertical distribuída na viga e carga de vento concentrada no pilar.',
    data: {
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 0, y: 4 },
        { id: 'C', x: 6, y: 4 },
        { id: 'D', x: 6, y: 0 }
      ],
      bars: [
        { id: 'b1', startNodeId: 'A', endNodeId: 'B' },
        { id: 'b2', startNodeId: 'B', endNodeId: 'C' },
        { id: 'b3', startNodeId: 'C', endNodeId: 'D' }
      ],
      supports: [
        { id: 's1', nodeId: 'A', type: FrameSupportType.FIXED },
        { id: 's2', nodeId: 'D', type: FrameSupportType.FIXED }
      ],
      loads: [
        { id: 'l1', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b2', valueX: 0, valueY: -15 },
        { id: 'l2', type: FrameLoadType.POINT_GLOBAL, nodeId: 'B', valueX: 20, valueY: 0 }
      ]
    }
  },
  {
    name: 'Galpão com Viga Anexa (2.85 EI / 2 EI)',
    description: 'Exemplo hiperestático com cobertura inclinada de 2.85 EI, pilares de 6m, cumeeira de 9m e viga de 12m (2 EI).',
    data: {
      considerAxialDeformation: false,
      considerShearDeformation: false,
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 0, y: 6 },
        { id: 'C', x: 8, y: 9 },
        { id: 'D', x: 16, y: 6 },
        { id: 'E', x: 16, y: 0 },
        { id: 'F', x: 28, y: 6 }
      ],
      bars: [
        { id: 'b1', startNodeId: 'A', endNodeId: 'B', eiFactor: 1, eaFactor: 1 },
        { id: 'b2', startNodeId: 'B', endNodeId: 'C', eiFactor: 2.85, eaFactor: 2.85 },
        { id: 'b3', startNodeId: 'C', endNodeId: 'D', eiFactor: 2.85, eaFactor: 2.85 },
        { id: 'b4', startNodeId: 'E', endNodeId: 'D', eiFactor: 1, eaFactor: 1 },
        { id: 'b5', startNodeId: 'D', endNodeId: 'F', eiFactor: 2, eaFactor: 2 }
      ],
      supports: [
        { id: 's1', nodeId: 'A', type: FrameSupportType.PINNED },
        { id: 's2', nodeId: 'E', type: FrameSupportType.PINNED },
        { id: 's3', nodeId: 'F', type: FrameSupportType.PINNED }
      ],
      loads: [
        { id: 'l1', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b2', isProjected: true, valueX: 0, valueY: -10 },
        { id: 'l2', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b3', isProjected: true, valueX: 0, valueY: -10 },
        { id: 'l3', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b5', isProjected: false, valueX: 0, valueY: -10 }
      ]
    }
  },
  {
    name: 'Galpão em Duas Águas (Inclinado)',
    description: 'Pórtico com pilares retos e cobertura inclinada (duas águas) sob carga distribuída.',
    data: {
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 0, y: 3.5 },
        { id: 'C', x: 4, y: 5.5 },
        { id: 'D', x: 8, y: 3.5 },
        { id: 'E', x: 8, y: 0 }
      ],
      bars: [
        { id: 'b1', startNodeId: 'A', endNodeId: 'B' },
        { id: 'b2', startNodeId: 'B', endNodeId: 'C' },
        { id: 'b3', startNodeId: 'C', endNodeId: 'D' },
        { id: 'b4', startNodeId: 'D', endNodeId: 'E' }
      ],
      supports: [
        { id: 's1', nodeId: 'A', type: FrameSupportType.PINNED },
        { id: 's2', nodeId: 'E', type: FrameSupportType.PINNED }
      ],
      loads: [
        { id: 'l1', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b2', valueX: 0, valueY: -10 },
        { id: 'l2', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b3', valueX: 0, valueY: -10 }
      ]
    }
  },
  {
    name: 'Pórtico Triarticulado (com Rótula)',
    description: 'Pórtico com rótula no ápice (cumeira), perfeitamente isostático com barra inclinada.',
    data: {
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 0, y: 4 },
        { id: 'C', x: 4, y: 6 },
        { id: 'D', x: 8, y: 4 },
        { id: 'E', x: 8, y: 0 }
      ],
      bars: [
        { id: 'b1', startNodeId: 'A', endNodeId: 'B' },
        { id: 'b2', startNodeId: 'B', endNodeId: 'C', hasEndHinge: true },
        { id: 'b3', startNodeId: 'C', endNodeId: 'D', hasStartHinge: true },
        { id: 'b4', startNodeId: 'D', endNodeId: 'E' }
      ],
      supports: [
        { id: 's1', nodeId: 'A', type: FrameSupportType.PINNED },
        { id: 's2', nodeId: 'E', type: FrameSupportType.PINNED }
      ],
      loads: [
        { id: 'l1', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b2', valueX: 0, valueY: -12 },
        { id: 'l2', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b3', valueX: 0, valueY: -12 }
      ]
    }
  },
  {
    name: 'Pórtico Contínuo 2 Vãos',
    description: 'Pórtico de dois vãos e pilar central com cargas assimétricas verticais e momento aplicado.',
    data: {
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 0, y: 4 },
        { id: 'C', x: 5, y: 4 },
        { id: 'D', x: 5, y: 0 },
        { id: 'E', x: 10, y: 4 },
        { id: 'F', x: 10, y: 0 }
      ],
      bars: [
        { id: 'b1', startNodeId: 'A', endNodeId: 'B' },
        { id: 'b2', startNodeId: 'B', endNodeId: 'C' },
        { id: 'b3', startNodeId: 'C', endNodeId: 'D' },
        { id: 'b4', startNodeId: 'C', endNodeId: 'E' },
        { id: 'b5', startNodeId: 'E', endNodeId: 'F' }
      ],
      supports: [
        { id: 's1', nodeId: 'A', type: FrameSupportType.FIXED },
        { id: 's2', nodeId: 'D', type: FrameSupportType.PINNED },
        { id: 's3', nodeId: 'F', type: FrameSupportType.ROLLER_Y }
      ],
      loads: [
        { id: 'l1', type: FrameLoadType.DISTRIBUTED_GLOBAL, barId: 'b2', valueX: 0, valueY: -15 },
        { id: 'l2', type: FrameLoadType.POINT_GLOBAL, barId: 'b4', position: 2.5, valueY: -30 }
      ]
    }
  }
];

export const format2Dec = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  const rounded = Math.abs(val) < 0.005 ? 0 : val;
  return rounded.toFixed(2);
};

interface FrameAnalysisProps {
  currentUser?: User | null;
}

const FrameAnalysis: React.FC<FrameAnalysisProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === UserRole.ADMIN || 
                  currentUser?.username === 'solideogloria' || 
                  (currentUser as any)?.email === 'benhur.psilva@gmail.com';

  const [frame, setFrame] = useState<FrameData>(PRESETS[0].data);

  const [activeViewTab, setActiveViewTab] = useState<'global' | 'member' | 'reactions' | 'steps' | 'table'>('global');
  const [effortType, setEffortType] = useState<'n' | 'v' | 'm' | 'deflection'>('m');
  const [diagramScale, setDiagramScale] = useState(0.8);
  const [selectedBarId, setSelectedBarId] = useState<string>('b2');

  const [selectedElement, setSelectedElement] = useState<{ type: 'node' | 'bar' | 'support' | 'load'; id: string } | null>(null);
  const [isAdding, setIsAdding] = useState<
    'node' | 'bar' | 'support_fixed' | 'support_pinned' | 'support_roller_y' | 'support_roller_x' |
    'point_load' | 'dist_load' | 'moment_load' | null
  >(null);

  // New Node Modal / Inline coordinate adder
  const [quickCoord, setQuickCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingBarStart, setConnectingBarStart] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // Share / Export / Import Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importInputText, setImportInputText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [loadRangeMode, setLoadRangeMode] = useState<'projected' | 'inclined'>('projected');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analysis = useMemo(() => analyzeFrame(frame), [frame]);

  // Load portico from URL Hash if provided (ex: #portico=PORTICO-...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('portico=')) {
        const encoded = hash.split('portico=')[1];
        if (encoded) {
          const decoded = decodeFrameCode(encoded);
          if (decoded && decoded.nodes && decoded.nodes.length > 0) {
            setFrame(decoded);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse URL hash portico', e);
    }
  }, []);

  // If selected bar is deleted or changed, ensure valid bar selection
  React.useEffect(() => {
    if (frame.bars.length > 0 && !frame.bars.some(b => b.id === selectedBarId)) {
      setSelectedBarId(frame.bars[0].id);
    }
  }, [frame.bars, selectedBarId]);

  const getNodeLabel = (nodeId: string) => {
    if (nodeId.length === 1 && nodeId >= 'A' && nodeId <= 'Z') return nodeId;
    const index = frame.nodes.findIndex(n => n.id === nodeId);
    if (index !== -1) return String.fromCharCode(65 + (index % 26));
    return nodeId;
  };

  // Canvas ViewBox Calculation
  const getViewBox = () => {
    if (frame.nodes.length === 0) return { minX: 0, minY: 0, width: 10, height: 10 };
    const xs = frame.nodes.map(n => n.x);
    const ys = frame.nodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = Math.max(3, maxX - minX);
    const h = Math.max(3, maxY - minY);
    return {
      minX: minX - w * 0.25,
      minY: minY - h * 0.25,
      width: w * 1.5,
      height: h * 1.5
    };
  };

  const vb = getViewBox();
  const toX = (val: number) => ((val - vb.minX) / vb.width) * 1000;
  const toY = (val: number) => 500 - ((val - vb.minY) / vb.height) * 500;
  const fromX = (canvasX: number, width: number) => (canvasX / width) * vb.width + vb.minX;
  const fromY = (canvasY: number, height: number) => (1 - canvasY / height) * vb.height + vb.minY;

  // Auto-scale for global diagram drawing
  const getScaleFactor = () => {
    if (!analysis.isValid) return 1;
    let maxVal = 0;
    analysis.barResults.forEach(br => {
      br.points.forEach(p => {
        const val = effortType === 'deflection' 
          ? Math.abs(p.deflection || 0) 
          : Math.abs(p[effortType]);
        if (val > maxVal) maxVal = val;
      });
    });
    if (maxVal === 0) return 1;

    const xs = frame.nodes.map(n => n.x);
    const ys = frame.nodes.map(n => n.y);
    const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const structureDim = Math.max(w, h);

    return (structureDim * 0.18 / maxVal) * diagramScale;
  };

  const sf = getScaleFactor();

  // Add / Remove / Update Helpers
  const addNode = (x: number, y: number) => {
    // Determine next letter
    const existingIds = new Set(frame.nodes.map(n => n.id));
    let nextLetter = 'A';
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      if (!existingIds.has(char)) {
        nextLetter = char;
        break;
      }
    }
    const newNode: FrameNode = {
      id: nextLetter,
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2))
    };
    setFrame(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    return newNode.id;
  };

  const addBar = (startId: string, endId: string) => {
    if (startId === endId) return;
    const exists = frame.bars.some(b => 
      (b.startNodeId === startId && b.endNodeId === endId) || 
      (b.startNodeId === endId && b.endNodeId === startId)
    );
    if (exists) return;

    const newBar: FrameBar = {
      id: `b${frame.bars.length + 1}`,
      startNodeId: startId,
      endNodeId: endId
    };
    setFrame(prev => ({ ...prev, bars: [...prev.bars, newBar] }));
    setSelectedBarId(newBar.id);
  };

  const addSupport = (nodeId: string, type: FrameSupportType) => {
    setFrame(prev => {
      const filtered = prev.supports.filter(s => s.nodeId !== nodeId);
      const newSupport: FrameSupport = {
        id: `s${Date.now().toString().slice(-4)}`,
        nodeId,
        type
      };
      return { ...prev, supports: [...filtered, newSupport] };
    });
  };

  const addLoad = (config: Partial<FrameLoad>) => {
    const newLoad: FrameLoad = {
      id: `l${Date.now().toString().slice(-4)}`,
      type: config.type || FrameLoadType.POINT_GLOBAL,
      ...config
    } as FrameLoad;
    setFrame(prev => ({ ...prev, loads: [...prev.loads, newLoad] }));
  };

  const removeNode = (id: string) => {
    setFrame(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      bars: prev.bars.filter(b => b.startNodeId !== id && b.endNodeId !== id),
      supports: prev.supports.filter(s => s.nodeId !== id),
      loads: prev.loads.filter(l => l.nodeId !== id)
    }));
    if (selectedElement?.id === id) setSelectedElement(null);
  };

  const removeBar = (id: string) => {
    setFrame(prev => ({
      ...prev,
      bars: prev.bars.filter(b => b.id !== id),
      loads: prev.loads.filter(l => l.barId !== id)
    }));
    if (selectedElement?.id === id) setSelectedElement(null);
  };

  const removeSupport = (id: string) => {
    setFrame(prev => ({
      ...prev,
      supports: prev.supports.filter(s => s.id !== id)
    }));
    if (selectedElement?.id === id) setSelectedElement(null);
  };

  const removeLoad = (id: string) => {
    setFrame(prev => ({
      ...prev,
      loads: prev.loads.filter(l => l.id !== id)
    }));
    if (selectedElement?.id === id) setSelectedElement(null);
  };

  const updateNode = (id: string, updates: Partial<FrameNode>) => {
    setFrame(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
  };

  const updateBar = (id: string, updates: Partial<FrameBar>) => {
    setFrame(prev => ({
      ...prev,
      bars: prev.bars.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const updateLoad = (id: string, updates: Partial<FrameLoad>) => {
    setFrame(prev => ({
      ...prev,
      loads: prev.loads.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  // Selected bar results
  const selectedBarResult = useMemo(() => {
    return analysis.barResults.find(b => b.barId === selectedBarId);
  }, [analysis.barResults, selectedBarId]);

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1C448E] text-white rounded-2xl shadow-md">
              <Compass size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1C448E] uppercase tracking-tight">
                Análise de Pórticos Planos (Método da Rigidez)
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Barras Inclinadas • Rótulas • Esforços Internos N, V, M • Reações & Deslocamentos
              </p>
            </div>
          </div>

          {/* Model Presets & Share / Import / Clear */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Presets */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
              <Sparkles size={16} className="text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modelos:</span>
              <select
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  if (idx >= 0 && PRESETS[idx]) {
                    setFrame(PRESETS[idx].data);
                    setIsAdding(null);
                    setSelectedElement(null);
                    setConfirmClear(false);
                  }
                }}
                className="text-xs font-bold text-[#1C448E] bg-transparent outline-none cursor-pointer"
                defaultValue="0"
              >
                {PRESETS.map((p, i) => (
                  <option key={i} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Share / Export Code Button */}
            <button
              onClick={() => {
                setCopiedCode(false);
                setCopiedLink(false);
                setIsShareModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#1C448E] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs hover:border-slate-300 flex items-center gap-1.5"
              title="Gerar código ou link para compartilhar este pórtico com outros usuários"
            >
              <Share2 size={15} />
              <span>Compartilhar / Código</span>
            </button>

            {/* Import Code Button */}
            <button
              onClick={() => {
                setImportInputText('');
                setImportError(null);
                setIsImportModalOpen(true);
              }}
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 text-[#0084CA] rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5"
              title="Importar código ou arquivo de pórtico montado"
            >
              <Upload size={15} />
              <span>Importar Pórtico</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-2xl border border-red-200 animate-in fade-in zoom-in duration-150">
                <button
                  onClick={() => {
                    setFrame({ nodes: [], bars: [], supports: [], loads: [] });
                    setSelectedElement(null);
                    setIsAdding(null);
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                title="Limpar Estrutura"
              >
                <Trash2 size={16} />
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Status Alert if invalid */}
          {!analysis.isValid && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
              <AlertCircle size={20} className="shrink-0 text-amber-600" />
              <div className="text-xs font-bold">
                {analysis.errorMessage || 'Adicione apoios suficientes para evitar que a estrutura seja um mecanismo móvel.'}
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          {analysis.isValid && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Classificação</p>
                <p className="text-sm font-black text-[#1C448E] uppercase mt-1">
                  {analysis.isHyperstatic ? 'Hiperestático' : 'Isoestático'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Graus de Liberdade</p>
                <p className="text-sm font-black text-[#0084CA] uppercase mt-1">
                  {analysis.degreeOfFreedom} GL Livres
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equilíbrio ΣFx</p>
                <p className={`text-sm font-black mt-1 ${Math.abs(analysis.equilibriumCheck.sumFx) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {analysis.equilibriumCheck.sumFx.toFixed(2)} kN
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equilíbrio ΣFy</p>
                <p className={`text-sm font-black mt-1 ${Math.abs(analysis.equilibriumCheck.sumFy) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {analysis.equilibriumCheck.sumFy.toFixed(2)} kN
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Máx Momento Fletor</p>
                <p className="text-sm font-black text-indigo-900 mt-1">
                  {(() => {
                    let maxM = 0;
                    analysis.barResults.forEach(b => {
                      b.points.forEach(p => { if (Math.abs(p.m) > Math.abs(maxM)) maxM = p.m; });
                    });
                    return `${maxM.toFixed(1)} kNm`;
                  })()}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Máx Força Normal</p>
                <p className="text-sm font-black text-slate-800 mt-1">
                  {(() => {
                    let maxN = 0;
                    analysis.barResults.forEach(b => {
                      b.points.forEach(p => { if (Math.abs(p.n) > Math.abs(maxN)) maxN = p.n; });
                    });
                    return `${maxN.toFixed(1)} kN`;
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Analysis Hypotheses (Deformações Axiais e Cisalhamento) */}
          <div className="mb-8 p-4 bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white text-[#1C448E] rounded-xl border border-slate-200 shadow-xs shrink-0">
                <Sliders size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-[#1C448E] uppercase tracking-wider">
                    Hipóteses de Deformação & Teoria Estrutural
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-blue-100/80 text-[#1C448E]">
                    {frame.considerAxialDeformation ? 'EA Real (Deformável)' : 'Inextensível (Manual / Flexibilidade)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {frame.considerAxialDeformation
                    ? 'Considerando encurtamento elástico real das barras sob esforço normal (Método Matricial Geral).'
                    : 'Barras inextensíveis longitudinalmente (compatível com Método das Forças/Flexibilidade, Cross e resoluções manuais).'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
              {/* Axial Deformation Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Deformação Axial (EA):
                </span>
                <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setFrame(f => ({ ...f, considerAxialDeformation: false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      !frame.considerAxialDeformation
                        ? 'bg-[#1C448E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Hipótese de barras inextensíveis: elimina encurtamento axial, idêntico ao Método das Forças manual"
                  >
                    Desprezar (Inextensível)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrame(f => ({ ...f, considerAxialDeformation: true }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      frame.considerAxialDeformation
                        ? 'bg-[#1C448E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Considera deformação axial das barras (EA real com seção e módulo de elasticidade)"
                  >
                    Considerar (EA Real)
                  </button>
                </div>
              </div>

              {/* Shear Deformation Toggle */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Cisalhamento (Timoshenko):
                </span>
                <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => setFrame(f => ({ ...f, considerShearDeformation: false }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      !frame.considerShearDeformation
                        ? 'bg-[#1C448E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Teoria clássica de Euler-Bernoulli (despreza deformação por cisalhamento)"
                  >
                    Euler-Bernoulli (Padrão)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrame(f => ({ ...f, considerShearDeformation: true }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      frame.considerShearDeformation
                        ? 'bg-[#1C448E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Teoria de Vigas de Timoshenko (considera distorção por cisalhamento)"
                  >
                    Timoshenko
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Toolbox */}
          <div className="mb-8 flex flex-wrap gap-4 justify-center">
            {/* Geometria */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Geometria (Adicionar)</p>
              <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 h-[60px] items-center">
                <button
                  onClick={() => setIsAdding(isAdding === 'node' ? null : 'node')}
                  className={`px-3 py-2 h-11 rounded-xl shadow-sm transition-all flex items-center gap-1.5 border text-xs font-black uppercase ${
                    isAdding === 'node' ? 'bg-[#1C448E] text-white border-[#1C448E]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Adicionar Nó"
                >
                  <Plus size={16} />
                  <span>+ Nó</span>
                </button>

                <button
                  onClick={() => {
                    setConnectingBarStart(null);
                    setIsAdding(isAdding === 'bar' ? null : 'bar');
                  }}
                  className={`px-3 py-2 h-11 rounded-xl shadow-sm transition-all flex items-center gap-1.5 border text-xs font-black uppercase ${
                    isAdding === 'bar' ? 'bg-[#1C448E] text-white border-[#1C448E]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Conectar dois nós para criar barra"
                >
                  <GripVertical size={16} />
                  <span>+ Barra</span>
                </button>
              </div>
            </div>

            {/* Apoios */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Apoios (Clique no Nó)</p>
              <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 h-[60px] items-center">
                {[
                  { type: FrameSupportType.PINNED, label: 'Fixo', mode: 'support_pinned' },
                  { type: FrameSupportType.ROLLER_Y, label: 'Móvel Y', mode: 'support_roller_y' },
                  { type: FrameSupportType.ROLLER_X, label: 'Móvel X', mode: 'support_roller_x' },
                  { type: FrameSupportType.FIXED, label: 'Engaste', mode: 'support_fixed' },
                ].map(({ type, label, mode }) => {
                  const isActive = isAdding === mode;
                  return (
                    <button
                      key={type}
                      onClick={() => setIsAdding(isActive ? null : (mode as any))}
                      className={`h-11 px-3 rounded-xl shadow-sm transition-all text-[#0084CA] relative group flex items-center gap-1.5 border text-xs font-black uppercase ${
                        isActive ? 'bg-[#0084CA] text-white border-[#0084CA]' : 'bg-white border-slate-200 hover:shadow-md'
                      }`}
                      title={`Adicionar apoio ${label}`}
                    >
                      {type === FrameSupportType.PINNED && (
                        <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] ${isActive ? 'border-b-white' : 'border-b-current'}`} />
                      )}
                      {type === FrameSupportType.ROLLER_Y && (
                        <div className="flex flex-col items-center">
                          <div className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] ${isActive ? 'border-b-white' : 'border-b-current'}`} />
                          <div className={`w-3 h-0.5 mt-0.5 ${isActive ? 'bg-indigo-200' : 'bg-slate-300'}`} />
                        </div>
                      )}
                      {type === FrameSupportType.ROLLER_X && (
                        <div className="flex items-center gap-0.5">
                          <div className={`w-0.5 h-3 ${isActive ? 'bg-indigo-200' : 'bg-slate-300'}`} />
                          <div className={`w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[7px] ${isActive ? 'border-r-white' : 'border-r-current'}`} />
                        </div>
                      )}
                      {type === FrameSupportType.FIXED && (
                        <div className={`w-1.5 h-4 rounded-full ${isActive ? 'bg-white' : 'bg-slate-800'}`} />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cargas */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargas (Clique p/ Adicionar)</p>
              <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 h-[60px] items-center">
                {[
                  { type: 'point_load', label: 'Concentrada', icon: ArrowDown },
                  { type: 'dist_load', label: 'Distribuída', icon: MoveHorizontal },
                  { type: 'moment_load', label: 'Momento', icon: RotateCw },
                ].map(({ type, label, icon: Icon }) => {
                  const isActive = isAdding === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setIsAdding(isActive ? null : (type as any))}
                      className={`h-11 px-3 rounded-xl shadow-sm transition-all text-[#1C448E] relative group flex items-center gap-1.5 border text-xs font-black uppercase ${
                        isActive ? 'bg-[#1C448E] text-white border-[#1C448E]' : 'bg-white border-slate-200 hover:shadow-md'
                      }`}
                      title={`Adicionar ${label}`}
                    >
                      <Icon size={16} className={isActive ? 'text-white' : 'text-[#1C448E]'} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Mode Notice */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-center mb-6 flex flex-wrap items-center justify-center gap-3 shadow-sm"
              >
                <Info size={16} className="text-amber-600" />
                <span>
                  {isAdding === 'node' && 'MODO ATIVO: Clique no grid ou digite as coordenadas abaixo para adicionar um Nó'}
                  {isAdding === 'bar' && (!connectingBarStart ? 'MODO ATIVO: Clique no Nó Inicial' : `MODO ATIVO: Nó ${connectingBarStart} selecionado. Agora clique no Nó Final para criar a barra.`)}
                  {isAdding?.startsWith('support_') && 'MODO ATIVO: Clique no Nó onde deseja fixar o apoio selecionado'}
                  {isAdding === 'point_load' && 'MODO ATIVO: Clique em um Nó ou Barra para aplicar a Carga Concentrada'}
                  {isAdding === 'dist_load' && 'MODO ATIVO: Clique em uma Barra para aplicar Carga Distribuída'}
                  {isAdding === 'moment_load' && 'MODO ATIVO: Clique em um Nó para aplicar Momento Fletor'}
                </span>
                <button
                  onClick={() => {
                    setIsAdding(null);
                    setConnectingBarStart(null);
                  }}
                  className="px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded-lg text-[10px] font-black uppercase text-amber-900 transition-colors"
                >
                  Cancelar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Node Coordinate Input Bar (when adding node) */}
          {isAdding === 'node' && (
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-center gap-4">
              <span className="text-xs font-black text-[#1C448E] uppercase">Coordenadas Precisas do Nó:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">X (m):</span>
                <input
                  type="number"
                  step="0.5"
                  value={quickCoord.x}
                  onChange={(e) => setQuickCoord(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#1C448E]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Y (m):</span>
                <input
                  type="number"
                  step="0.5"
                  value={quickCoord.y}
                  onChange={(e) => setQuickCoord(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#1C448E]"
                />
              </div>
              <button
                onClick={() => {
                  addNode(quickCoord.x, quickCoord.y);
                  setQuickCoord({ x: quickCoord.x + 2, y: quickCoord.y });
                }}
                className="px-4 py-1.5 bg-[#1C448E] text-white rounded-xl text-xs font-black uppercase hover:bg-blue-900 transition-colors shadow-sm"
              >
                Adicionar Nó ({quickCoord.x}, {quickCoord.y})
              </button>
            </div>
          )}

          {/* Interactive SVG Canvas */}
          <div className="relative aspect-[2/1] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden mb-8 shadow-inner">
            <svg
              className={`w-full h-full ${isAdding ? 'cursor-crosshair' : 'cursor-default'}`}
              viewBox="0 0 1000 500"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = fromX(e.clientX - rect.left, rect.width);
                const y = fromY(e.clientY - rect.top, rect.height);

                if (isAdding === 'node') {
                  addNode(x, y);
                  setIsAdding(null);
                } else {
                  setSelectedElement(null);
                }
              }}
            >
              <defs>
                <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.75" />
                </pattern>
                <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,1 L5,3 L0,5 Z" fill="#ef4444" />
                </marker>
                <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,1 L5,3 L0,5 Z" fill="#1C448E" />
                </marker>
                <marker id="arrow-cyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,1 L5,3 L0,5 Z" fill="#0084CA" />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect width="100%" height="100%" fill="url(#canvas-grid)" />

              {/* Bars */}
              {frame.bars.map(bar => {
                const n1 = frame.nodes.find(n => n.id === bar.startNodeId);
                const n2 = frame.nodes.find(n => n.id === bar.endNodeId);
                if (!n1 || !n2) return null;

                const x1 = toX(n1.x);
                const y1 = toY(n1.y);
                const x2 = toX(n2.x);
                const y2 = toY(n2.y);
                const isSelected = selectedElement?.id === bar.id || selectedBarId === bar.id;

                const L = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2));
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g
                    key={bar.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAdding === 'point_load') {
                        addLoad({ barId: bar.id, type: FrameLoadType.POINT_LOCAL, valuePerpendicular: -15, position: L / 2 });
                        setIsAdding(null);
                      } else if (isAdding === 'dist_load') {
                        addLoad({ barId: bar.id, type: FrameLoadType.DISTRIBUTED_LOCAL, valuePerpendicular: -10 });
                        setIsAdding(null);
                      } else {
                        setSelectedBarId(bar.id);
                        setSelectedElement({ type: 'bar', id: bar.id });
                      }
                    }}
                  >
                    {/* Transparent Click Area */}
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="24" />

                    {/* Bar Line */}
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSelected ? '#0084CA' : '#1C448E'}
                      strokeWidth={isSelected ? 6 : 4}
                      strokeLinecap="round"
                      className="transition-all hover:stroke-[#0084CA]"
                    />

                    {/* Bar Label Badge */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x={bar.eiFactor && bar.eiFactor !== 1 ? -24 : -14}
                        y="-9"
                        width={bar.eiFactor && bar.eiFactor !== 1 ? 48 : 28}
                        height="18"
                        rx="6"
                        fill="white"
                        stroke={isSelected ? '#0084CA' : (bar.eiFactor && bar.eiFactor !== 1 ? '#f59e0b' : '#cbd5e1')}
                        strokeWidth="1.5"
                      />
                      <text textAnchor="middle" y="4" className="text-[10px] font-black fill-[#1C448E]">
                        {bar.id}{bar.eiFactor && bar.eiFactor !== 1 ? ` (${bar.eiFactor}EI)` : ''}
                      </text>
                    </g>

                    {/* Internal Hinges (Rótulas) */}
                    {bar.hasStartHinge && (
                      <circle
                        cx={x1 + (x2 - x1) * 0.1}
                        cy={y1 + (y2 - y1) * 0.1}
                        r="6"
                        fill="white"
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                    )}
                    {bar.hasEndHinge && (
                      <circle
                        cx={x2 - (x2 - x1) * 0.1}
                        cy={y2 - (y2 - y1) * 0.1}
                        r="6"
                        fill="white"
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                    )}
                  </g>
                );
              })}

              {/* Supports */}
              {frame.supports.map(s => {
                const node = frame.nodes.find(n => n.id === s.nodeId);
                if (!node) return null;
                const xc = toX(node.x);
                const yc = toY(node.y);
                const isSelected = selectedElement?.id === s.id;

                return (
                  <g
                    key={s.id}
                    transform={`translate(${xc}, ${yc})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement({ type: 'support', id: s.id });
                    }}
                  >
                    {s.type === FrameSupportType.FIXED && (
                      <rect x="-14" y="0" width="28" height="7" fill="#334155" rx="1.5" stroke={isSelected ? '#0084CA' : 'none'} strokeWidth="2" />
                    )}
                    {s.type === FrameSupportType.PINNED && (
                      <path d="M -12 16 L 0 0 L 12 16 Z" fill="#0084CA" stroke={isSelected ? '#1C448E' : 'none'} strokeWidth="2" />
                    )}
                    {s.type === FrameSupportType.ROLLER_Y && (
                      <g>
                        <path d="M -12 14 L 0 0 L 12 14 Z" fill="#0084CA" stroke={isSelected ? '#1C448E' : 'none'} strokeWidth="2" />
                        <line x1="-12" y1="18" x2="12" y2="18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                      </g>
                    )}
                    {s.type === FrameSupportType.ROLLER_X && (
                      <g>
                        <path d="M -14 -12 L 0 0 L -14 12 Z" fill="#0084CA" stroke={isSelected ? '#1C448E' : 'none'} strokeWidth="2" />
                        <line x1="-18" y1="-12" x2="-18" y2="12" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                      </g>
                    )}
                    <text y="28" textAnchor="middle" className="text-[9px] font-black fill-slate-400 uppercase tracking-tighter pointer-events-none">
                      {supportLabels[s.type]}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {frame.nodes.map(node => {
                const cx = toX(node.x);
                const cy = toY(node.y);
                const isSelected = selectedElement?.id === node.id;
                const isBarStart = connectingBarStart === node.id;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (isAdding === 'bar') {
                        if (!connectingBarStart) {
                          setConnectingBarStart(node.id);
                        } else {
                          addBar(connectingBarStart, node.id);
                          setConnectingBarStart(null);
                          setIsAdding(null);
                        }
                      } else if (isAdding?.startsWith('support_')) {
                        const supType = isAdding.replace('support_', '').toUpperCase() as FrameSupportType;
                        addSupport(node.id, supType);
                        setIsAdding(null);
                      } else if (isAdding === 'point_load') {
                        addLoad({ nodeId: node.id, type: FrameLoadType.POINT_GLOBAL, valueX: 0, valueY: -20 });
                        setIsAdding(null);
                      } else if (isAdding === 'moment_load') {
                        addLoad({ nodeId: node.id, type: FrameLoadType.MOMENT, valueMoment: 15 });
                        setIsAdding(null);
                      } else {
                        setSelectedElement({ type: 'node', id: node.id });
                      }
                    }}
                  >
                    {/* Transparent Click Area for easy selection */}
                    <circle cx={cx} cy={cy} r="18" fill="transparent" />

                    <circle
                      cx={cx}
                      cy={cy}
                      r={isBarStart ? 13 : isSelected ? 11 : 8.5}
                      fill={isBarStart ? '#f59e0b' : isSelected ? '#0084CA' : '#1C448E'}
                      stroke="white"
                      strokeWidth={isSelected || isBarStart ? 3 : 2.5}
                      className="transition-colors duration-150 group-hover:fill-[#0084CA] group-hover:stroke-blue-200"
                    />
                    <text
                      x={cx}
                      y={cy - 14}
                      textAnchor="middle"
                      className="text-[13px] font-black fill-[#1C448E] group-hover:fill-[#0084CA] uppercase tracking-tight pointer-events-none transition-colors duration-150 select-none"
                    >
                      {getNodeLabel(node.id)}
                    </text>
                  </g>
                );
              })}

              {/* Loads */}
              {frame.loads.map(l => {
                const isSelected = selectedElement?.id === l.id;

                // Nodal Point Load
                if (l.nodeId && (l.type === FrameLoadType.POINT_GLOBAL || l.type === FrameLoadType.POINT_LOCAL)) {
                  const node = frame.nodes.find(n => n.id === l.nodeId);
                  if (!node) return null;
                  const cx = toX(node.x);
                  const cy = toY(node.y);
                  const fx = l.valueX || 0;
                  const fy = l.valueY || 0;

                  return (
                    <g
                      key={l.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'load', id: l.id });
                      }}
                    >
                      {/* Vertical arrow */}
                      {fy !== 0 && (
                        <g>
                          <line
                            x1={cx}
                            y1={fy < 0 ? cy - 45 : cy + 45}
                            x2={cx}
                            y2={fy < 0 ? cy - 6 : cy + 6}
                            stroke={isSelected ? '#0084CA' : '#ef4444'}
                            strokeWidth="3"
                            markerEnd="url(#arrow-red)"
                          />
                          <rect x={cx - 24} y={fy < 0 ? cy - 62 : cy + 50} width="48" height="18" rx="6" fill="white" stroke="#ef4444" strokeWidth="1.5" />
                          <text x={cx} y={fy < 0 ? cy - 50 : cy + 62} textAnchor="middle" className="text-[10px] font-extrabold fill-[#ef4444]">
                            {Math.abs(fy)} kN
                          </text>
                        </g>
                      )}

                      {/* Horizontal arrow */}
                      {fx !== 0 && (
                        <g>
                          <line
                            x1={fx > 0 ? cx - 45 : cx + 45}
                            y1={cy}
                            x2={fx > 0 ? cx - 6 : cx + 6}
                            y2={cy}
                            stroke={isSelected ? '#0084CA' : '#1C448E'}
                            strokeWidth="3"
                            markerEnd="url(#arrow-blue)"
                          />
                          <rect x={fx > 0 ? cx - 65 : cx + 20} y={cy - 9} width="48" height="18" rx="6" fill="white" stroke="#1C448E" strokeWidth="1.5" />
                          <text x={fx > 0 ? cx - 41 : cx + 44} y={cy + 3} textAnchor="middle" className="text-[10px] font-extrabold fill-[#1C448E]">
                            {Math.abs(fx)} kN
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // Nodal Moment
                if (l.nodeId && l.type === FrameLoadType.MOMENT) {
                  const node = frame.nodes.find(n => n.id === l.nodeId);
                  if (!node) return null;
                  const cx = toX(node.x);
                  const cy = toY(node.y);
                  const m = l.valueMoment || 0;
                  const isCW = m < 0;
                  const R = 22;
                  const path = isCW
                    ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx} ${cy - R}`
                    : `M ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx} ${cy - R}`;

                  return (
                    <g
                      key={l.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'load', id: l.id });
                      }}
                    >
                      <path d={path} fill="none" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrow-blue)" />
                      <rect x={cx + 12} y={cy - 30} width="54" height="18" rx="6" fill="white" stroke="#6366f1" strokeWidth="1.5" />
                      <text x={cx + 39} y={cy - 18} textAnchor="middle" className="text-[9px] font-black fill-[#6366f1]">
                        {Math.abs(m)} kNm
                      </text>
                    </g>
                  );
                }

                // Member Distributed Load
                if (l.barId && (l.type === FrameLoadType.DISTRIBUTED_GLOBAL || l.type === FrameLoadType.DISTRIBUTED_LOCAL)) {
                  const b = frame.bars.find(bar => bar.id === l.barId);
                  if (!b) return null;
                  const n1 = frame.nodes.find(n => n.id === b.startNodeId);
                  const n2 = frame.nodes.find(n => n.id === b.endNodeId);
                  if (!n1 || !n2) return null;

                  const barLength = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) || 1;
                  const posA = Math.max(0, Math.min(barLength, l.position !== undefined ? l.position : 0));
                  let posB = Math.max(posA, Math.min(barLength, l.endPosition !== undefined ? l.endPosition : barLength));
                  if (posB <= posA) posB = barLength;

                  const t1 = posA / barLength;
                  const t2 = posB / barLength;

                  const x1 = toX(n1.x);
                  const y1 = toY(n1.y);
                  const x2 = toX(n2.x);
                  const y2 = toY(n2.y);

                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const tx = dx / len;
                  const ty = dy / len;
                  const nx = -ty;
                  const ny = tx;

                  const isLocal = l.type === FrameLoadType.DISTRIBUTED_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0);
                  const isAxial = l.valueNormal !== undefined && l.valueNormal !== 0;
                  const val = isAxial
                    ? l.valueNormal
                    : isLocal 
                    ? (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || -10))
                    : (l.valueY !== undefined && l.valueY !== 0 ? l.valueY : (l.valueX || -10));

                  const isProjectedLoad = (l.type === FrameLoadType.DISTRIBUTED_GLOBAL && l.isProjected !== false);
                  const isInclinedMember = Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5;
                  const spanRatio = (posB - posA) / barLength;
                  const numArrows = Math.max(3, Math.min(8, Math.round(6 * spanRatio) + 1));
                  const arrowLength = 28;
                  const sign = (val || 0) < 0 ? 1 : -1;

                  // Compute textbook style FLOATING horizontal comb for global projected vertical loads:
                  // The baseline is a straight horizontal line floating above the highest point of the member/roof,
                  // and all vertical arrows have equal height (floating completely in the air, not stretching down to touch the slope).
                  let projectedBaselineY = 0;
                  let projectedTipY = 0;
                  if (isProjectedLoad && (l.valueX === undefined || l.valueX === 0)) {
                    const segY1 = y1 + dy * t1;
                    const segY2 = y1 + dy * t2;
                    const minSegY = Math.min(segY1, segY2); // highest physical point on screen (smaller Y)
                    const maxSegY = Math.max(segY1, segY2); // lowest physical point on screen (larger Y)
                    if ((val || 0) < 0) {
                      // Downward gravity load: floating above the roof
                      projectedBaselineY = minSegY - 45;
                      projectedTipY = minSegY - 15;
                    } else {
                      // Upward load: floating below
                      projectedBaselineY = maxSegY + 45;
                      projectedTipY = maxSegY + 15;
                    }
                  }

                  const arrowPoints = [];
                  for (let i = 0; i <= numArrows; i++) {
                    const frac = i / numArrows;
                    const t = t1 + (t2 - t1) * frac;
                    const bx = x1 + dx * t;
                    const by = y1 + dy * t;

                    let tailX: number, tailY: number, tipX: number, tipY: number;

                    if (isAxial) {
                      tailX = bx - tx * arrowLength * sign;
                      tailY = by - ty * arrowLength * sign;
                      tipX = bx - tx * 4 * sign;
                      tipY = by - ty * 4 * sign;
                    } else if (isLocal) {
                      tailX = bx - nx * arrowLength * sign;
                      tailY = by - ny * arrowLength * sign;
                      tipX = bx - nx * 4 * sign;
                      tipY = by - ny * 4 * sign;
                    } else if (l.valueX !== undefined && l.valueX !== 0 && (l.valueY === undefined || l.valueY === 0)) {
                      if (isProjectedLoad) {
                        // Floating vertical comb for projected horizontal load (e.g. wind on vertical projection)
                        const segX1 = x1 + dx * t1;
                        const segX2 = x1 + dx * t2;
                        const refX = (l.valueX > 0) ? Math.min(segX1, segX2) - 40 : Math.max(segX1, segX2) + 40;
                        const tipXProj = (l.valueX > 0) ? refX + 28 : refX - 28;
                        tailX = refX;
                        tailY = by;
                        tipX = tipXProj;
                        tipY = by;
                      } else {
                        // Pure horizontal global along bar
                        const xSign = l.valueX > 0 ? 1 : -1;
                        tailX = bx - 32 * xSign;
                        tailY = by;
                        tipX = bx - 4 * xSign;
                        tipY = by;
                      }
                    } else if (isProjectedLoad) {
                      // Textbook style FLOATING comb (floating horizontally above the structure, exactly like handwritten diagrams)
                      tailX = bx;
                      tailY = projectedBaselineY;
                      tipX = bx;
                      tipY = projectedTipY;
                    } else {
                      // Pure vertical global along bar
                      tailX = bx;
                      tailY = (val || 0) < 0 ? by - 32 : by + 32;
                      tipX = bx;
                      tipY = (val || 0) < 0 ? by - 4 : by + 4;
                    }

                    arrowPoints.push({ bx, by, tailX, tailY, tipX, tipY });
                  }

                  const midIdx = Math.floor(numArrows / 2);
                  const badgeX = isLocal || isAxial
                    ? arrowPoints[midIdx].tailX - nx * 14 * sign
                    : (arrowPoints[0].tailX + arrowPoints[numArrows].tailX) / 2;
                  const badgeY = isLocal || isAxial
                    ? arrowPoints[midIdx].tailY - ny * 14 * sign
                    : isProjectedLoad
                    ? ((val || 0) < 0 ? projectedBaselineY - 14 : projectedBaselineY + 14)
                    : ((val || 0) < 0 ? arrowPoints[midIdx].tailY - 14 : arrowPoints[midIdx].tailY + 14);

                  const isPartial = Math.abs(posA) > 0.05 || Math.abs(posB - barLength) > 0.05;
                  const projXVal = Math.abs(n2.x - n1.x) * (posB - posA) / barLength;
                  const totalQ = Math.abs(val || 0) * (isProjectedLoad ? projXVal : (posB - posA));
                  const badgeText = isPartial 
                    ? (isProjectedLoad ? `q=${Math.abs(val || 0)} [ΔX=${projXVal.toFixed(1)}m | Q=${totalQ.toFixed(1)}kN]` : `q=${Math.abs(val || 0)} [${posA.toFixed(1)}-${posB.toFixed(1)}m]`)
                    : isProjectedLoad 
                    ? `q=${Math.abs(val || 0)} kN/m (proj. H | Q=${totalQ.toFixed(0)}kN)`
                    : `q=${Math.abs(val || 0)} kN/m`;

                  const badgeW = isPartial ? (isProjectedLoad ? 140 : 100) : (isProjectedLoad ? 135 : 75);

                  return (
                    <g
                      key={l.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'load', id: l.id });
                      }}
                    >
                      {/* Top connecting load line */}
                      <line
                        x1={arrowPoints[0].tailX}
                        y1={arrowPoints[0].tailY}
                        x2={arrowPoints[numArrows].tailX}
                        y2={arrowPoints[numArrows].tailY}
                        stroke={isSelected ? '#0084CA' : '#0284c7'}
                        strokeWidth="2.5"
                      />

                      {/* Distributed arrows */}
                      {arrowPoints.map((a, idx) => (
                        <line
                          key={idx}
                          x1={a.tailX}
                          y1={a.tailY}
                          x2={a.tipX}
                          y2={a.tipY}
                          stroke={isSelected ? '#0084CA' : '#0284c7'}
                          strokeWidth="2"
                          markerEnd="url(#arrow-cyan)"
                        />
                      ))}

                      {/* Magnitude Badge */}
                      <rect
                        x={badgeX - badgeW / 2}
                        y={badgeY - 10}
                        width={badgeW}
                        height="20"
                        rx="6"
                        fill="white"
                        stroke={isSelected ? '#0084CA' : '#0284c7'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="shadow-sm"
                      />
                      <text
                        x={badgeX}
                        y={badgeY + 4}
                        textAnchor="middle"
                        className="text-[9px] font-black fill-[#0284c7] pointer-events-none select-none"
                      >
                        {badgeText}
                      </text>
                    </g>
                  );
                }

                // Member Point Load
                if (l.barId && (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL)) {
                  const b = frame.bars.find(bar => bar.id === l.barId);
                  if (!b) return null;
                  const n1 = frame.nodes.find(n => n.id === b.startNodeId);
                  const n2 = frame.nodes.find(n => n.id === b.endNodeId);
                  if (!n1 || !n2) return null;

                  const x1 = toX(n1.x);
                  const y1 = toY(n1.y);
                  const x2 = toX(n2.x);
                  const y2 = toY(n2.y);

                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const tx = dx / len;
                  const ty = dy / len;
                  const nx = -ty;
                  const ny = tx;

                  const L = Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2));
                  const t = (l.position !== undefined ? l.position : L / 2) / (L || 1);
                  const px = x1 + dx * t;
                  const py = y1 + dy * t;

                  const isLocalPerp = l.type === FrameLoadType.POINT_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0);
                  const isAxial = l.valueNormal !== undefined && l.valueNormal !== 0;

                  const val = isLocalPerp 
                    ? (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || -15))
                    : isAxial
                    ? (l.valueNormal || 0)
                    : (l.valueY !== 0 ? (l.valueY || 0) : (l.valueX || -15));

                  const arrowLen = 45;
                  let tailX: number, tailY: number, tipX: number, tipY: number, badgeX: number, badgeY: number;

                  if (isLocalPerp) {
                    // Perpendicular to bar
                    const sign = val < 0 ? 1 : -1;
                    tailX = px - nx * arrowLen * sign;
                    tailY = py - ny * arrowLen * sign;
                    tipX = px - nx * 5 * sign;
                    tipY = py - ny * 5 * sign;
                    badgeX = px - nx * (arrowLen + 15) * sign;
                    badgeY = py - ny * (arrowLen + 15) * sign;
                  } else if (isAxial) {
                    // Along the bar axis
                    const sign = val < 0 ? 1 : -1;
                    tailX = px - tx * arrowLen * sign;
                    tailY = py - ty * arrowLen * sign;
                    tipX = px - tx * 5 * sign;
                    tipY = py - ty * 5 * sign;
                    badgeX = px - tx * (arrowLen + 15) * sign;
                    badgeY = py - ty * (arrowLen + 15) * sign;
                  } else if (l.valueX !== undefined && l.valueX !== 0 && (l.valueY === undefined || l.valueY === 0)) {
                    // Horizontal global
                    const sign = (l.valueX || 0) > 0 ? 1 : -1;
                    tailX = px - arrowLen * sign;
                    tailY = py;
                    tipX = px - 5 * sign;
                    tipY = py;
                    badgeX = px - (arrowLen + 18) * sign;
                    badgeY = py;
                  } else {
                    // Vertical global
                    const sign = val < 0 ? 1 : -1;
                    tailX = px;
                    tailY = py - arrowLen * sign;
                    tipX = px;
                    tipY = py - 5 * sign;
                    badgeX = px;
                    badgeY = py - (arrowLen + 18) * sign;
                  }

                  return (
                    <g
                      key={l.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'load', id: l.id });
                      }}
                    >
                      <line
                        x1={tailX}
                        y1={tailY}
                        x2={tipX}
                        y2={tipY}
                        stroke={isSelected ? '#0084CA' : '#ef4444'}
                        strokeWidth="3.5"
                        markerEnd="url(#arrow-red)"
                      />
                      {/* Generous Hit Box */}
                      <rect
                        x={badgeX - 32}
                        y={badgeY - 13}
                        width="64"
                        height="26"
                        rx="8"
                        fill="white"
                        stroke={isSelected ? '#0084CA' : '#ef4444'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all shadow-sm"
                      />
                      <text
                        x={badgeX}
                        y={badgeY + 4}
                        textAnchor="middle"
                        className={`text-[10px] font-black pointer-events-none select-none ${isSelected ? 'fill-[#0084CA]' : 'fill-[#ef4444]'}`}
                      >
                        P = {Math.abs(val)} kN
                      </text>
                    </g>
                  );
                }

                return null;
              })}
            </svg>
          </div>

          {/* Element Inspector / Edit Panel */}
          {selectedElement && (
            <div className="mb-8 p-6 bg-slate-50 border-2 border-blue-100 rounded-3xl animate-in fade-in slide-in-from-top-2 shadow-md">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#1C448E]/10 rounded-xl text-[#1C448E]">
                    <Settings2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#1C448E] uppercase tracking-tight">
                      Propriedades do Elemento ({selectedElement.type === 'load' ? 'Carga' : selectedElement.type === 'node' ? 'Nó' : selectedElement.type === 'bar' ? 'Barra' : 'Apoio'}: {selectedElement.id})
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ajuste os valores, posição ou remova o elemento</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedElement.type === 'node') removeNode(selectedElement.id);
                      if (selectedElement.type === 'bar') removeBar(selectedElement.id);
                      if (selectedElement.type === 'support') removeSupport(selectedElement.id);
                      if (selectedElement.type === 'load') removeLoad(selectedElement.id);
                    }}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-colors border border-red-200"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                  <button
                    onClick={() => setSelectedElement(null)}
                    className="px-3.5 py-1.5 bg-[#1C448E] hover:bg-blue-900 text-white rounded-xl text-xs font-black uppercase transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              {/* Node Inspector */}
              {selectedElement.type === 'node' && (() => {
                const node = frame.nodes.find(n => n.id === selectedElement.id);
                if (!node) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Identificador</label>
                      <input
                        type="text"
                        value={node.id}
                        disabled
                        className="w-full px-3 py-2 bg-slate-200 rounded-xl text-xs font-bold text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Posição X (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={node.x}
                        onChange={(e) => updateNode(node.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Posição Y (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={node.y}
                        onChange={(e) => updateNode(node.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Bar Inspector */}
              {selectedElement.type === 'bar' && (() => {
                const bar = frame.bars.find(b => b.id === selectedElement.id);
                if (!bar) return null;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Barra ID</label>
                        <input
                          type="text"
                          value={bar.id}
                          disabled
                          className="w-full px-3 py-2 bg-slate-200 rounded-xl text-xs font-bold text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nó Inicial</label>
                        <select
                          value={bar.startNodeId}
                          onChange={(e) => updateBar(bar.id, { startNodeId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        >
                          {frame.nodes.map(n => <option key={n.id} value={n.id}>{n.id} ({n.x}, {n.y})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nó Final</label>
                        <select
                          value={bar.endNodeId}
                          onChange={(e) => updateBar(bar.id, { endNodeId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        >
                          {frame.nodes.map(n => <option key={n.id} value={n.id}>{n.id} ({n.x}, {n.y})</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Rigidez à Flexão (EI) e Axial (EA) */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#1C448E] uppercase tracking-wider">
                            Rigidez da Barra:
                          </span>
                          <span className="px-2.5 py-0.5 bg-[#1C448E] text-white text-[11px] font-black rounded-lg shadow-xs">
                            {bar.eiFactor !== undefined && bar.eiFactor !== 1 ? `${bar.eiFactor} · EI` : '1.0 · EI (Padrão)'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          Multiplicador de Rigidez
                        </span>
                      </div>

                      {/* Quick Multiplier Buttons */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase mr-1">Atalhos EI:</span>
                        {[0.5, 1, 1.5, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => updateBar(bar.id, { eiFactor: val, eaFactor: val })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                              (bar.eiFactor ?? 1) === val
                                ? 'bg-[#1C448E] text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {val} EI
                          </button>
                        ))}
                      </div>

                      {/* Custom Multipliers inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                            Rigidez à Flexão: <strong className="text-[#1C448E]">X · EI</strong>
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0.01"
                              value={bar.eiFactor ?? 1}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                updateBar(bar.id, { eiFactor: val });
                              }}
                              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                            />
                            <span className="text-xs font-black text-slate-600">× EI</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold mt-1">Ex: 1 = EI, 2 = 2×EI (dobro da inércia), 0.5 = 0.5×EI, etc.</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                            Rigidez Axial: <strong className="text-[#1C448E]">X · EA</strong>
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              step="0.1"
                              min="0.01"
                              value={bar.eaFactor ?? (bar.eiFactor ?? 1)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                updateBar(bar.id, { eaFactor: val });
                              }}
                              className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                            />
                            <span className="text-xs font-black text-slate-600">× EA</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold mt-1">Geralmente proporcional a EI (ou 1×EA)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bar.hasStartHinge || false}
                          onChange={(e) => updateBar(bar.id, { hasStartHinge: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1C448E]"
                        />
                        <span className="text-xs font-bold text-slate-700">Rótula Interna no Nó Inicial (Libera Momento M=0)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bar.hasEndHinge || false}
                          onChange={(e) => updateBar(bar.id, { hasEndHinge: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1C448E]"
                        />
                        <span className="text-xs font-bold text-slate-700">Rótula Interna no Nó Final (Libera Momento M=0)</span>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Support Inspector */}
              {selectedElement.type === 'support' && (() => {
                const sup = frame.supports.find(s => s.id === selectedElement.id);
                if (!sup) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nó Vinculado</label>
                      <select
                        value={sup.nodeId}
                        onChange={(e) => {
                          setFrame(prev => ({
                            ...prev,
                            supports: prev.supports.map(s => s.id === sup.id ? { ...s, nodeId: e.target.value } : s)
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        {frame.nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tipo de Vínculo</label>
                      <select
                        value={sup.type}
                        onChange={(e) => {
                          setFrame(prev => ({
                            ...prev,
                            supports: prev.supports.map(s => s.id === sup.id ? { ...s, type: e.target.value as FrameSupportType } : s)
                          }));
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value={FrameSupportType.PINNED}>Apoio Fixo (Impede Ux, Uy)</option>
                        <option value={FrameSupportType.ROLLER_Y}>Apoio Móvel Y (Impede Uy, Livre em X)</option>
                        <option value={FrameSupportType.ROLLER_X}>Apoio Móvel X (Impede Ux, Livre em Y)</option>
                        <option value={FrameSupportType.FIXED}>Engaste Perfeito (Impede Ux, Uy, Rz)</option>
                      </select>
                    </div>
                  </div>
                );
              })()}

              {/* Load Inspector */}
              {selectedElement.type === 'load' && (() => {
                const l = frame.loads.find(load => load.id === selectedElement.id);
                if (!l) return null;

                const selectedBar = l.barId ? frame.bars.find(b => b.id === l.barId) : null;
                const n1 = selectedBar ? frame.nodes.find(n => n.id === selectedBar.startNodeId) : null;
                const n2 = selectedBar ? frame.nodes.find(n => n.id === selectedBar.endNodeId) : null;
                const barLength = (n1 && n2) ? Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) : 5;
                const dxBar = (n1 && n2) ? (n2.x - n1.x) : barLength;
                const dyBar = (n1 && n2) ? (n2.y - n1.y) : 0;
                const barAngleDeg = ((Math.atan2(dyBar, dxBar) * 180) / Math.PI).toFixed(1);

                const isPointLoadOnBar = l.barId && (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL);
                const isDistLoad = l.type === FrameLoadType.DISTRIBUTED_GLOBAL || l.type === FrameLoadType.DISTRIBUTED_LOCAL;
                const isNodalPoint = l.nodeId && (l.type === FrameLoadType.POINT_GLOBAL || l.type === FrameLoadType.POINT_LOCAL);
                const isMoment = l.type === FrameLoadType.MOMENT;

                const posA = Math.max(0, Math.min(barLength, l.position !== undefined ? l.position : 0));
                const posB = Math.max(posA, Math.min(barLength, l.endPosition !== undefined ? l.endPosition : barLength));
                const loadedLength = Math.max(0, posB - posA);
                const projX = (Math.abs(dxBar) * loadedLength) / (barLength || 1);
                const projY = (Math.abs(dyBar) * loadedLength) / (barLength || 1);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Target selection */}
                      {l.nodeId && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nó Aplicado</label>
                          <select
                            value={l.nodeId}
                            onChange={(e) => updateLoad(l.id, { nodeId: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                          >
                            {frame.nodes.map(n => <option key={n.id} value={n.id}>Nó {n.id} ({n.x}, {n.y})</option>)}
                          </select>
                        </div>
                      )}

                      {l.barId && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Barra Aplicada</label>
                          <select
                            value={l.barId}
                            onChange={(e) => updateLoad(l.id, { barId: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                          >
                            {frame.bars.map(b => <option key={b.id} value={b.id}>Barra {b.id} ({b.startNodeId} → {b.endNodeId})</option>)}
                          </select>
                        </div>
                      )}

                      {/* Direction selector for Member Loads */}
                      {l.barId && !isMoment && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Direção da Carga</label>
                          <select
                            value={
                              (l.valueNormal !== undefined && l.valueNormal !== 0) ? 'axial'
                              : (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.DISTRIBUTED_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0)) ? 'perpendicular'
                              : (l.valueX !== undefined && l.valueX !== 0 && (l.valueY === undefined || l.valueY === 0)) ? (l.isProjected === false ? 'global_x_real' : 'global_x_proj')
                              : (l.isProjected === false ? 'global_y_real' : 'global_y_proj')
                            }
                            onChange={(e) => {
                              const dir = e.target.value;
                              const currVal = l.valuePerpendicular ?? l.valueY ?? l.valueX ?? l.valueNormal ?? (isPointLoadOnBar ? -15 : -10);
                              if (isPointLoadOnBar) {
                                if (dir === 'perpendicular') {
                                  updateLoad(l.id, { type: FrameLoadType.POINT_LOCAL, isProjected: false, valuePerpendicular: currVal, valueNormal: 0, valueX: 0, valueY: 0 });
                                } else if (dir === 'global_y_proj' || dir === 'global_y_real') {
                                  updateLoad(l.id, { type: FrameLoadType.POINT_GLOBAL, isProjected: false, valueY: currVal, valueX: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'global_x_proj' || dir === 'global_x_real') {
                                  updateLoad(l.id, { type: FrameLoadType.POINT_GLOBAL, isProjected: false, valueX: currVal, valueY: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'axial') {
                                  updateLoad(l.id, { type: FrameLoadType.POINT_LOCAL, isProjected: false, valueNormal: currVal, valuePerpendicular: 0, valueX: 0, valueY: 0 });
                                }
                              } else {
                                if (dir === 'perpendicular') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_LOCAL, isProjected: false, valuePerpendicular: currVal, valueNormal: 0, valueX: 0, valueY: 0 });
                                } else if (dir === 'global_y_proj') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_GLOBAL, isProjected: true, valueY: currVal, valueX: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'global_y_real') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_GLOBAL, isProjected: false, valueY: currVal, valueX: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'global_x_proj') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_GLOBAL, isProjected: true, valueX: currVal, valueY: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'global_x_real') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_GLOBAL, isProjected: false, valueX: currVal, valueY: 0, valuePerpendicular: 0, valueNormal: 0 });
                                } else if (dir === 'axial') {
                                  updateLoad(l.id, { type: FrameLoadType.DISTRIBUTED_LOCAL, isProjected: false, valueNormal: currVal, valuePerpendicular: 0, valueX: 0, valueY: 0 });
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                          >
                            <option value="global_y_proj">Global Vertical (Y) - Projetada na Horizontal (q · ΔX) [Padrão]</option>
                            <option value="global_x_proj">Global Horizontal (X) - Projetada na Vertical (q · ΔY) [Padrão]</option>
                            <option value="perpendicular">Perpendicular à Barra (Transversal, q · L)</option>
                            <option value="axial">Axial (Ao longo da Barra, q · L)</option>
                            <option value="global_y_real">Global Vertical (Y) - Sobre Comp. Real da Barra (q · L)</option>
                            <option value="global_x_real">Global Horizontal (X) - Sobre Comp. Real da Barra (q · L)</option>
                          </select>
                        </div>
                      )}

                      {/* Position along bar for point load on member */}
                      {isPointLoadOnBar && (() => {
                        const isInclined = Math.abs(dxBar) > 0.05 && Math.abs(dyBar) > 0.05;
                        const totalProjX = Math.abs(dxBar);
                        const currPos = l.position !== undefined ? l.position : (barLength / 2);
                        const currPosProjX = (currPos * totalProjX) / (barLength || 1);

                        return (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-black text-slate-400 uppercase">
                                Ponto de Aplicação
                              </label>
                              {isInclined && (
                                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[9px] font-black">
                                  <button
                                    type="button"
                                    onClick={() => setLoadRangeMode('projected')}
                                    className={`px-1.5 py-0.5 rounded-md transition-all ${
                                      loadRangeMode === 'projected' ? 'bg-[#1C448E] text-white' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Proj. ΔX
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLoadRangeMode('inclined')}
                                    className={`px-1.5 py-0.5 rounded-md transition-all ${
                                      loadRangeMode === 'inclined' ? 'bg-[#1C448E] text-white' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Comp. Real (s)
                                  </button>
                                </div>
                              )}
                            </div>

                            {isInclined && loadRangeMode === 'projected' ? (
                              <div className="space-y-1">
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={totalProjX}
                                    value={parseFloat(currPosProjX.toFixed(2))}
                                    onChange={(e) => {
                                      const pX = Math.max(0, Math.min(totalProjX, parseFloat(e.target.value) || 0));
                                      const pos = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { position: pos });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={totalProjX}
                                    step="0.05"
                                    value={currPosProjX}
                                    onChange={(e) => {
                                      const pX = Math.max(0, Math.min(totalProjX, parseFloat(e.target.value) || 0));
                                      const pos = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { position: pos });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold block">
                                  X = {currPosProjX.toFixed(2)} m (Total Vão: {totalProjX.toFixed(2)} m | s = {currPos.toFixed(2)} m)
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={barLength}
                                    value={parseFloat(currPos.toFixed(2))}
                                    onChange={(e) => {
                                      const pos = Math.max(0, Math.min(barLength, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { position: pos });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={barLength}
                                    step="0.05"
                                    value={currPos}
                                    onChange={(e) => {
                                      const pos = Math.max(0, Math.min(barLength, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { position: pos });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold block">
                                  s = {currPos.toFixed(2)} m (Comp. Total da Barra: {barLength.toFixed(2)} m)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Concentrated Load Magnitude on Bar */}
                      {isPointLoadOnBar && (() => {
                        const isAxial = l.valueNormal !== undefined && l.valueNormal !== 0;
                        const isPerp = l.type === FrameLoadType.POINT_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0);
                        const isGX = l.valueX !== undefined && l.valueX !== 0 && (l.valueY === undefined || l.valueY === 0);

                        const currentVal = isAxial ? (l.valueNormal || 0)
                          : isPerp ? (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || -15))
                          : isGX ? (l.valueX || 0)
                          : (l.valueY || 0);

                        return (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                              Magnitude P (kN)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="1"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (isAxial) {
                                    updateLoad(l.id, { valueNormal: val });
                                  } else if (isPerp) {
                                    updateLoad(l.id, { valuePerpendicular: val, valueY: val });
                                  } else if (isGX) {
                                    updateLoad(l.id, { valueX: val });
                                  } else {
                                    updateLoad(l.id, { valueY: val });
                                  }
                                }}
                                className="flex-grow min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const inverted = -currentVal;
                                  if (isAxial) {
                                    updateLoad(l.id, { valueNormal: inverted });
                                  } else if (isPerp) {
                                    updateLoad(l.id, { valuePerpendicular: inverted, valueY: inverted });
                                  } else if (isGX) {
                                    updateLoad(l.id, { valueX: inverted });
                                  } else {
                                    updateLoad(l.id, { valueY: inverted });
                                  }
                                }}
                                className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                                title="Inverter Sentido"
                              >
                                +/-
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold block mt-1">
                              {isPerp ? 'Negativo: apontando para a barra / gravidade' : isGX ? '+X Direita / -X Esquerda' : isAxial ? '+ Compressão / - Tração' : '+Y Cima / -Y Baixo'}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Distributed Load Magnitude on Bar */}
                      {isDistLoad && (() => {
                        const isAxial = l.valueNormal !== undefined && l.valueNormal !== 0;
                        const isPerp = l.type === FrameLoadType.DISTRIBUTED_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0);
                        const isGX = l.valueX !== undefined && l.valueX !== 0 && (l.valueY === undefined || l.valueY === 0);

                        const currentVal = isAxial ? (l.valueNormal || 0)
                          : isPerp ? (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0 ? l.valuePerpendicular : (l.valueY || -10))
                          : isGX ? (l.valueX || 0)
                          : (l.valueY || 0);

                        return (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                              Taxa Distribuída q (kN/m)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="1"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (isAxial) {
                                    updateLoad(l.id, { valueNormal: val });
                                  } else if (isPerp) {
                                    updateLoad(l.id, { valuePerpendicular: val, valueY: val });
                                  } else if (isGX) {
                                    updateLoad(l.id, { valueX: val });
                                  } else {
                                    updateLoad(l.id, { valueY: val });
                                  }
                                }}
                                className="flex-grow min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const inverted = -currentVal;
                                  if (isAxial) {
                                    updateLoad(l.id, { valueNormal: inverted });
                                  } else if (isPerp) {
                                    updateLoad(l.id, { valuePerpendicular: inverted, valueY: inverted });
                                  } else if (isGX) {
                                    updateLoad(l.id, { valueX: inverted });
                                  } else {
                                    updateLoad(l.id, { valueY: inverted });
                                  }
                                }}
                                className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                                title="Inverter Sentido"
                              >
                                +/-
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold block mt-1">
                              {isPerp ? 'Negativo: normal à barra (gravidade/pressão)' : isGX ? '+qx Direita / -qx Esquerda' : '+qy Cima / -qy Baixo'}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Nodal Point Load (Fx & Fy) */}
                      {isNodalPoint && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Força Horizontal Fx (kN)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="1"
                                value={l.valueX || 0}
                                onChange={(e) => updateLoad(l.id, { valueX: parseFloat(e.target.value) || 0 })}
                                className="flex-grow min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateLoad(l.id, { valueX: -(l.valueX || 0) })}
                                className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                                title="Inverter Sentido"
                              >
                                +/-
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Força Vertical Fy (kN)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                step="1"
                                value={l.valueY || 0}
                                onChange={(e) => updateLoad(l.id, { valueY: parseFloat(e.target.value) || 0 })}
                                className="flex-grow min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateLoad(l.id, { valueY: -(l.valueY || 0) })}
                                className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                                title="Inverter Sentido"
                              >
                                +/-
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Moment Load */}
                      {isMoment && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Momento Mz (kNm)</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="1"
                              value={l.valueMoment || 0}
                              onChange={(e) => updateLoad(l.id, { valueMoment: parseFloat(e.target.value) || 0 })}
                              className="flex-grow min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1C448E] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateLoad(l.id, { valueMoment: -(l.valueMoment || 0) })}
                              className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-colors"
                            >
                              +/-
                            </button>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1">Positivo: Anti-horário / Negativo: Horário</span>
                        </div>
                      )}
                    </div>

                    {/* Extended Distributed Load Partial Range Controls */}
                    {isDistLoad && (() => {
                      const isInclined = Math.abs(dxBar) > 0.05 && Math.abs(dyBar) > 0.05;
                      const totalProjX = Math.abs(dxBar);
                      const posAProjX = (posA * totalProjX) / (barLength || 1);
                      const posBProjX = (posB * totalProjX) / (barLength || 1);

                      return (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#1C448E] uppercase tracking-wider">
                                Trecho de Aplicação
                              </span>
                              {isInclined && (
                                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[10px] font-black">
                                  <button
                                    type="button"
                                    onClick={() => setLoadRangeMode('projected')}
                                    className={`px-2 py-0.5 rounded-md transition-all ${
                                      loadRangeMode === 'projected' ? 'bg-[#1C448E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Projeção Horizontal (ΔX)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLoadRangeMode('inclined')}
                                    className={`px-2 py-0.5 rounded-md transition-all ${
                                      loadRangeMode === 'inclined' ? 'bg-[#1C448E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Comp. Real Inclinado (s)
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateLoad(l.id, { position: 0, endPosition: barLength })}
                                className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 transition-colors shadow-xs"
                              >
                                {isInclined && loadRangeMode === 'projected' ? `Vão Todo (${totalProjX.toFixed(1)}m)` : 'Barra Toda'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLoad(l.id, { position: 0, endPosition: barLength / 2 })}
                                className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 transition-colors shadow-xs"
                              >
                                1ª Metade
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLoad(l.id, { position: barLength / 2, endPosition: barLength })}
                                className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 transition-colors shadow-xs"
                              >
                                2ª Metade
                              </button>
                            </div>
                          </div>

                          {isInclined && loadRangeMode === 'projected' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                  Início na Projeção Horizontal (ax): {posAProjX.toFixed(2)} m
                                </label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={posBProjX}
                                    value={parseFloat(posAProjX.toFixed(2))}
                                    onChange={(e) => {
                                      const pX = Math.max(0, Math.min(posBProjX, parseFloat(e.target.value) || 0));
                                      const val = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { position: val });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#1C448E]"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={totalProjX}
                                    step="0.05"
                                    value={posAProjX}
                                    onChange={(e) => {
                                      const pX = Math.max(0, Math.min(posBProjX, parseFloat(e.target.value) || 0));
                                      const val = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { position: val });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                  Fim na Projeção Horizontal (bx): {posBProjX.toFixed(2)} m
                                </label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={posAProjX}
                                    max={totalProjX}
                                    value={parseFloat(posBProjX.toFixed(2))}
                                    onChange={(e) => {
                                      const pX = Math.max(posAProjX, Math.min(totalProjX, parseFloat(e.target.value) || 0));
                                      const val = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { endPosition: val });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#1C448E]"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={totalProjX}
                                    step="0.05"
                                    value={posBProjX}
                                    onChange={(e) => {
                                      const pX = Math.max(posAProjX, Math.min(totalProjX, parseFloat(e.target.value) || 0));
                                      const val = (pX * barLength) / (totalProjX || 1);
                                      updateLoad(l.id, { endPosition: val });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                  Início da Carga (a): {posA.toFixed(2)} m
                                </label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={posB}
                                    value={parseFloat(posA.toFixed(2))}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(posB, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { position: val });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#1C448E]"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={barLength}
                                    step="0.05"
                                    value={posA}
                                    onChange={(e) => {
                                      const val = Math.max(0, Math.min(posB, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { position: val });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                  Fim da Carga (b): {posB.toFixed(2)} m
                                </label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={posA}
                                    max={barLength}
                                    value={parseFloat(posB.toFixed(2))}
                                    onChange={(e) => {
                                      const val = Math.max(posA, Math.min(barLength, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { endPosition: val });
                                    }}
                                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#1C448E]"
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max={barLength}
                                    step="0.05"
                                    value={posB}
                                    onChange={(e) => {
                                      const val = Math.max(posA, Math.min(barLength, parseFloat(e.target.value) || 0));
                                      updateLoad(l.id, { endPosition: val });
                                    }}
                                    className="flex-grow accent-[#1C448E]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Geometric feedback badge */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-bold text-slate-600 border-t border-slate-200">
                            <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                              Comprimento Carregado: <strong className="text-[#1C448E]">{loadedLength.toFixed(2)} m</strong>
                            </span>
                            {(Math.abs(dxBar) > 0.05 && Math.abs(dyBar) > 0.05) && (
                              <>
                                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                  Proj. Horizontal: <strong className="text-slate-800">{projX.toFixed(2)} m</strong> (Vão: {totalProjX.toFixed(2)} m)
                                </span>
                                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                  Proj. Vertical: <strong className="text-slate-800">{projY.toFixed(2)} m</strong>
                                </span>
                                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                  Inclinação da Barra: <strong className="text-slate-800">{barAngleDeg}°</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Results & Analysis Tabs Section */}
      {analysis.isValid && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Navigation Bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'global', label: 'Diagrama Global', icon: Layers },
                { id: 'member', label: 'Diagrama por Barra', icon: Activity },
                { id: 'reactions', label: 'Reações & Deslocamentos', icon: Compass },
                { id: 'steps', label: 'Memorial de Cálculo', icon: FileText },
                { id: 'table', label: 'Tabela de Elementos', icon: TableIcon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveViewTab(id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    activeViewTab === id
                      ? 'bg-[#1C448E] text-white shadow-md shadow-blue-900/20'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Effort Switcher when in Global or Member view */}
            {(activeViewTab === 'global' || activeViewTab === 'member') && (
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                {[
                  { id: 'm', label: 'Momento Fletor (M)' },
                  { id: 'v', label: 'Cortante (V)' },
                  { id: 'n', label: 'Normal (N)' },
                  { id: 'deflection', label: 'Deformada (δ)' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setEffortType(id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                      effortType === id
                        ? 'bg-[#1C448E] text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-8">
            {/* VIEW 1: GLOBAL STRUCTURE DIAGRAM */}
            {activeViewTab === 'global' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-[#1C448E] uppercase tracking-tight">
                      {effortType === 'm' && 'Diagrama Global de Momento Fletor [kNm]'}
                      {effortType === 'v' && 'Diagrama Global de Esforço Cortante [kN]'}
                      {effortType === 'n' && 'Diagrama Global de Força Normal [kN]'}
                      {effortType === 'deflection' && 'Deformada Elástica Amplificada [mm]'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {effortType === 'm' && '* Desenhado no lado das fibras tracionadas (Convenção Estrutural)'}
                      {effortType === 'v' && '* Esforços cortantes perpendiculares a cada membro'}
                      {effortType === 'n' && '* Força axial (+ Tração / - Compressão)'}
                      {effortType === 'deflection' && '* Deslocamentos nodais e curvatura elástica de flexão'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Sliders size={14} className="text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Escala:</span>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={diagramScale}
                      onChange={(e) => setDiagramScale(parseFloat(e.target.value))}
                      className="w-28 accent-[#1C448E]"
                    />
                  </div>
                </div>

                {/* SVG Global Overlay Diagram */}
                <div className="relative aspect-[2/1] bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-inner p-4">
                  <svg className="w-full h-full" viewBox="0 0 1000 500">
                    {/* Grid */}
                    <rect width="100%" height="100%" fill="url(#canvas-grid)" />

                    {/* Bars & Overlay Polygons */}
                    {analysis.barResults.map(br => {
                      const bar = frame.bars.find(b => b.id === br.barId)!;
                      const n1 = frame.nodes.find(n => n.id === bar.startNodeId)!;
                      const n2 = frame.nodes.find(n => n.id === bar.endNodeId)!;
                      if (!n1 || !n2) return null;

                      const dx = n2.x - n1.x;
                      const dy = n2.y - n1.y;
                      const L = Math.sqrt(dx * dx + dy * dy);
                      const cos = dx / (L || 1);
                      const sin = dy / (L || 1);

                      const diagramPoints: string[] = [];
                      const color = effortType === 'n' ? '#1C448E' : effortType === 'v' ? '#0084CA' : effortType === 'deflection' ? '#8b5cf6' : '#334155';

                      if (effortType === 'deflection') {
                        // Deformed curve line
                        const deformedLinePoints = br.points.map(p => {
                          const px = toX(p.dxGlobal || (n1.x + p.x * cos));
                          const py = toY(p.dyGlobal || (n1.y + p.x * sin));
                          return `${px},${py}`;
                        }).join(' ');

                        return (
                          <g key={br.barId}>
                            {/* Original Undeformed */}
                            <line
                              x1={toX(n1.x)} y1={toY(n1.y)}
                              x2={toX(n2.x)} y2={toY(n2.y)}
                              stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4"
                            />
                            {/* Deformed Line */}
                            <polyline
                              points={deformedLinePoints}
                              fill="none"
                              stroke="#8b5cf6"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                          </g>
                        );
                      }

                      // Normal, Shear, or Moment
                      br.points.forEach((p, idx) => {
                        const xPos = n1.x + p.x * cos;
                        const yPos = n1.y + p.x * sin;
                        const val = p[effortType as 'n' | 'v' | 'm'];

                        // Draw factor: Moment positive on tension side (-1 inwards/bottom), Shear (+1), Normal (-1)
                        const df = effortType === 'v' ? 1.0 : -1.0;
                        const offX = -sin * val * sf * df;
                        const offY = cos * val * sf * df;

                        const px = toX(xPos + offX);
                        const py = toY(yPos + offY);
                        const bx = toX(xPos);
                        const by = toY(yPos);

                        if (idx === 0) diagramPoints.push(`${bx},${by}`);
                        diagramPoints.push(`${px},${py}`);
                        if (idx === br.points.length - 1) diagramPoints.push(`${bx},${by}`);
                      });

                      return (
                        <g key={br.barId}>
                          {/* Diagram Filled Area */}
                          <polygon
                            points={diagramPoints.join(' ')}
                            fill={color}
                            fillOpacity="0.12"
                            stroke={color}
                            strokeWidth="1.5"
                          />

                          {/* Base Bar */}
                          <line
                            x1={toX(n1.x)} y1={toY(n1.y)}
                            x2={toX(n2.x)} y2={toY(n2.y)}
                            stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
                          />

                          {/* Peak Values Labels */}
                          {(() => {
                            const pStart = br.points[0];
                            const pEnd = br.points[br.points.length - 1];
                            const df = effortType === 'v' ? 1.0 : -1.0;
                            const valStart = pStart[effortType as 'n' | 'v' | 'm'];
                            const valEnd = pEnd[effortType as 'n' | 'v' | 'm'];

                            const lx1 = toX(n1.x + (-sin * valStart * sf * df)) + (-sin * 14);
                            const ly1 = toY(n1.y + (cos * valStart * sf * df)) + (cos * -14);
                            const lx2 = toX(n2.x + (-sin * valEnd * sf * df)) + (-sin * 14);
                            const ly2 = toY(n2.y + (cos * valEnd * sf * df)) + (cos * -14);

                            // Find interior local extrema (maximum or minimum, e.g. parabola apex/trough in span DF)
                            // Only consider interior points reasonably separated from ends (5% to 95% of length)
                            let extremaPts: typeof br.points = [];
                            let maxDev = 0;
                            let bestPt: typeof br.points[0] | null = null;

                            const minIdx = Math.max(2, Math.floor(br.points.length * 0.08));
                            const maxIdx = Math.min(br.points.length - 3, Math.ceil(br.points.length * 0.92));

                            for (let i = minIdx; i <= maxIdx; i++) {
                              const prev = br.points[i - 1][effortType as 'n' | 'v' | 'm'];
                              const curr = br.points[i][effortType as 'n' | 'v' | 'm'];
                              const next = br.points[i + 1][effortType as 'n' | 'v' | 'm'];

                              const linearVal = valStart + (valEnd - valStart) * (br.points[i].x / (L || 1));
                              const deviation = Math.abs(curr - linearVal);

                              // Check if local extremum (peak or valley)
                              const isPeak = (curr >= prev && curr >= next) || (curr <= prev && curr <= next);
                              if (isPeak && deviation > 1.0 && Math.abs(curr) > 0.1) {
                                if (deviation > maxDev) {
                                  maxDev = deviation;
                                  bestPt = br.points[i];
                                }
                              }
                            }

                            if (bestPt) {
                              extremaPts.push(bestPt);
                            }

                            return (
                              <>
                                {Math.abs(valStart) > 0.05 && (
                                  <text
                                    x={lx1} y={ly1} textAnchor="middle" stroke="white" strokeWidth="3.5"
                                    paintOrder="stroke fill" className="text-[11px] font-extrabold fill-slate-800 pointer-events-none select-none"
                                  >
                                    {format2Dec(valStart)}
                                  </text>
                                )}
                                {extremaPts.map((pt, idx) => {
                                  const mVal = pt[effortType as 'n' | 'v' | 'm'];
                                  const mX = n1.x + pt.x * cos + (-sin * mVal * sf * df);
                                  const mY = n1.y + pt.x * sin + (cos * mVal * sf * df);
                                  return (
                                    <text
                                      key={idx}
                                      x={toX(mX) + (-sin * 14)}
                                      y={toY(mY) + (cos * -14)}
                                      textAnchor="middle"
                                      stroke="white"
                                      strokeWidth="3.5"
                                      paintOrder="stroke fill"
                                      className="text-[11px] font-extrabold fill-[#1C448E] pointer-events-none select-none"
                                    >
                                      {format2Dec(mVal)}
                                    </text>
                                  );
                                })}
                                {Math.abs(valEnd) > 0.05 && (
                                  <text
                                    x={lx2} y={ly2} textAnchor="middle" stroke="white" strokeWidth="3.5"
                                    paintOrder="stroke fill" className="text-[11px] font-extrabold fill-slate-800 pointer-events-none select-none"
                                  >
                                    {format2Dec(valEnd)}
                                  </text>
                                )}
                              </>
                            );
                          })()}
                        </g>
                      );
                    })}

                    {/* Nodes & Labels */}
                    {frame.nodes.map(n => (
                      <g key={n.id}>
                        <circle cx={toX(n.x)} cy={toY(n.y)} r="5" fill="#1C448E" stroke="white" strokeWidth="2" />
                        <text
                          x={toX(n.x)} y={toY(n.y) + 18}
                          textAnchor="middle"
                          className="text-[12px] font-black fill-[#1C448E] uppercase tracking-tighter"
                        >
                          {getNodeLabel(n.id)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            )}

            {/* VIEW 2: MEMBER BY MEMBER CHARTS */}
            {activeViewTab === 'member' && selectedBarResult && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecionar Barra:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {frame.bars.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setSelectedBarId(b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                            selectedBarId === b.id
                              ? 'bg-[#1C448E] text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {b.id} ({b.startNodeId} → {b.endNodeId})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    Comprimento: <strong className="text-slate-800">{selectedBarResult.length} m</strong> | Inclinação: <strong className="text-slate-800">{selectedBarResult.angleDeg}°</strong>
                  </div>
                </div>

                {/* Individual Chart */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-[#1C448E] uppercase tracking-tight">
                      {effortType === 'm' && `Momento Fletor ao Longo da Barra ${selectedBarId} [kNm]`}
                      {effortType === 'v' && `Esforço Cortante ao Longo da Barra ${selectedBarId} [kN]`}
                      {effortType === 'n' && `Força Normal ao Longo da Barra ${selectedBarId} [kN]`}
                      {effortType === 'deflection' && `Flecha / Deformada ao Longo da Barra ${selectedBarId} [mm]`}
                    </h4>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={selectedBarResult.points.map(p => ({
                          x: p.x,
                          val: effortType === 'deflection' ? p.deflection : p[effortType as 'n' | 'v' | 'm']
                        }))}
                        margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="x"
                          label={{ value: 'Posição x (m)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <YAxis
                          label={{
                            value: effortType === 'm' ? 'Momento (kNm)' : effortType === 'v' ? 'Cortante (kN)' : effortType === 'n' ? 'Normal (kN)' : 'Flecha (mm)',
                            angle: -90,
                            position: 'insideLeft',
                            fill: '#64748b',
                            fontSize: 11
                          }}
                          tick={{ fill: '#64748b', fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: any) => [`${format2Dec(Number(value))} ${effortType === 'm' ? 'kNm' : effortType === 'deflection' ? 'mm' : 'kN'}`, 'Valor']}
                          labelFormatter={(label) => `x = ${format2Dec(Number(label))} m`}
                        />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                        <Area
                          type="monotone"
                          dataKey="val"
                          stroke={effortType === 'n' ? '#1C448E' : effortType === 'v' ? '#0084CA' : effortType === 'deflection' ? '#8b5cf6' : '#334155'}
                          fill={effortType === 'n' ? '#1C448E' : effortType === 'v' ? '#0084CA' : effortType === 'deflection' ? '#8b5cf6' : '#334155'}
                          fillOpacity={0.2}
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: REACTIONS & DISPLACEMENTS */}
            {activeViewTab === 'reactions' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Support Reactions */}
                <div className="space-y-4">
                  <h3 className="text-base font-black text-[#1C448E] uppercase tracking-tight flex items-center gap-2">
                    <Compass size={18} />
                    Reações de Apoio nos Nós
                  </h3>
                  <div className="space-y-3">
                    {analysis.reactions.map(r => (
                      <div key={r.nodeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#1C448E] text-white flex items-center justify-center font-black text-sm">
                            {getNodeLabel(r.nodeId)}
                          </div>
                          <div>
                            <p className="font-black text-xs text-slate-800 uppercase">Nó {r.nodeId}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Reações Globais</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold">
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">Rx</span>
                            <span className="font-black text-slate-800">{format2Dec(r.fx)} kN</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">Ry</span>
                            <span className="font-black text-[#0084CA]">{format2Dec(r.fy)} kN</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">Mz</span>
                            <span className="font-black text-indigo-900">{format2Dec(r.mz)} kNm</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node Displacements */}
                <div className="space-y-4">
                  <h3 className="text-base font-black text-[#1C448E] uppercase tracking-tight flex items-center gap-2">
                    <Activity size={18} />
                    Deslocamentos e Rotações Nodais
                  </h3>
                  <div className="space-y-3">
                    {analysis.nodeDisplacements.map(d => (
                      <div key={d.nodeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-black text-sm">
                            {getNodeLabel(d.nodeId)}
                          </div>
                          <div>
                            <p className="font-black text-xs text-slate-800 uppercase">Nó {d.nodeId}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Graus de Liberdade</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold">
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">Dx</span>
                            <span className="font-black text-slate-800">{format2Dec(d.dx)} mm</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">Dy</span>
                            <span className="font-black text-slate-800">{format2Dec(d.dy)} mm</span>
                          </div>
                          <div className="text-center">
                            <span className="text-[9px] block text-slate-400 uppercase">θz</span>
                            <span className="font-black text-[#0084CA]">{format2Dec(d.rotZDeg)}°</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: STEP-BY-STEP CALCULATION MEMORIAL */}
            {activeViewTab === 'steps' && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                  <h3 className="text-base font-black text-[#1C448E] uppercase tracking-tight flex items-center gap-2">
                    <FileText size={18} />
                    Memorial Descritivo do Método da Rigidez Direta
                  </h3>

                  <div className="space-y-4">
                    {analysis.steps.map((s, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200">
                        <h4 className="font-black text-xs text-[#1C448E] uppercase mb-1">{s.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Matrix Preview */}
                  {analysis.globalMatrixPreview && (
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl overflow-x-auto font-mono text-[11px]">
                      <p className="font-bold text-amber-400 mb-2 uppercase tracking-widest text-[10px]">
                        Trecho da Matriz de Rigidez Global [K] (Primeiros Graus de Liberdade):
                      </p>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="p-1">DOF</th>
                            {analysis.globalMatrixPreview.dofLabels.map((lbl, j) => (
                              <th key={j} className="p-1 text-center">{lbl}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.globalMatrixPreview.matrix.map((row, i) => (
                            <tr key={i} className="border-b border-slate-800/40">
                              <td className="p-1 text-amber-300 font-bold">{analysis.globalMatrixPreview?.dofLabels[i]}</td>
                              {row.map((val, j) => (
                                <td key={j} className="p-1 text-center text-slate-300">
                                  {Math.abs(val) > 1e4 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 5: TABLES VIEW */}
            {activeViewTab === 'table' && (
              <div className="space-y-8">
                {/* Nodes Table */}
                <div>
                  <h4 className="text-xs font-black text-[#1C448E] uppercase tracking-wider mb-3">Tabela de Coordenadas dos Nós</h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left bg-white">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Nó</th>
                          <th className="p-3">Coord. X (m)</th>
                          <th className="p-3">Coord. Y (m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {frame.nodes.map(n => (
                          <tr key={n.id}>
                            <td className="p-3 font-black text-[#1C448E]">{n.id}</td>
                            <td className="p-3">{n.x.toFixed(2)}</td>
                            <td className="p-3">{n.y.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bars Table */}
                <div>
                  <h4 className="text-xs font-black text-[#1C448E] uppercase tracking-wider mb-3">Tabela de Conectividade e Rigidez das Barras</h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left bg-white">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Barra</th>
                          <th className="p-3">Nó Inicial</th>
                          <th className="p-3">Nó Final</th>
                          <th className="p-3">Rigidez (EI)</th>
                          <th className="p-3">Rigidez (EA)</th>
                          <th className="p-3">Rótula Inicial</th>
                          <th className="p-3">Rótula Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {frame.bars.map(b => (
                          <tr key={b.id}>
                            <td className="p-3 font-black text-[#1C448E]">{b.id}</td>
                            <td className="p-3">{b.startNodeId}</td>
                            <td className="p-3">{b.endNodeId}</td>
                            <td className="p-3 font-black text-[#1C448E]">{(b.eiFactor ?? 1)} · EI</td>
                            <td className="p-3 text-slate-600">{(b.eaFactor ?? (b.eiFactor ?? 1))} · EA</td>
                            <td className="p-3">{b.hasStartHinge ? 'Sim (M=0)' : 'Não'}</td>
                            <td className="p-3">{b.hasEndHinge ? 'Sim (M=0)' : 'Não'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Loads Table */}
                <div>
                  <h4 className="text-xs font-black text-[#1C448E] uppercase tracking-wider mb-3">Tabela de Cargas Aplicadas</h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left bg-white">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Aplicação</th>
                          <th className="p-3">Posição</th>
                          <th className="p-3">Valor / Magnitude</th>
                          <th className="p-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {frame.loads.map(l => {
                          const isPointBar = l.barId && (l.type === FrameLoadType.POINT_LOCAL || l.type === FrameLoadType.POINT_GLOBAL);
                          const isDist = l.type === FrameLoadType.DISTRIBUTED_GLOBAL || l.type === FrameLoadType.DISTRIBUTED_LOCAL;
                          const isNodal = l.nodeId && (l.type === FrameLoadType.POINT_GLOBAL || l.type === FrameLoadType.POINT_LOCAL);
                          const isMom = l.type === FrameLoadType.MOMENT;

                          let typeStr = '';
                          let valStr = '';

                          if (isPointBar) {
                            if (l.valueNormal !== undefined && l.valueNormal !== 0) {
                              typeStr = 'Pontual Axial';
                              valStr = `N = ${l.valueNormal} kN`;
                            } else if (l.type === FrameLoadType.POINT_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0)) {
                              typeStr = 'Pontual Perpendicular';
                              valStr = `P = ${l.valuePerpendicular ?? l.valueY ?? 0} kN`;
                            } else {
                              typeStr = 'Pontual Global';
                              valStr = l.valueX ? `Fx = ${l.valueX} kN` : `Fy = ${l.valueY ?? 0} kN`;
                            }
                          } else if (isDist) {
                            const barOfLoad = frame.bars.find(b => b.id === l.barId);
                            let bLen = 5;
                            if (barOfLoad) {
                              const n1b = frame.nodes.find(n => n.id === barOfLoad.startNodeId);
                              const n2b = frame.nodes.find(n => n.id === barOfLoad.endNodeId);
                              if (n1b && n2b) bLen = Math.sqrt(Math.pow(n2b.x - n1b.x, 2) + Math.pow(n2b.y - n1b.y, 2));
                            }
                            const pA = Math.max(0, Math.min(bLen, l.position !== undefined ? l.position : 0));
                            const pB = Math.max(pA, Math.min(bLen, l.endPosition !== undefined ? l.endPosition : bLen));
                            const isPart = Math.abs(pA) > 0.05 || Math.abs(pB - bLen) > 0.05;

                            if (l.valueNormal !== undefined && l.valueNormal !== 0) {
                              typeStr = `Distribuída Axial${isPart ? ' (Parcial)' : ''}`;
                              valStr = `qa = ${l.valueNormal} kN/m`;
                            } else if (l.type === FrameLoadType.DISTRIBUTED_LOCAL || (l.valuePerpendicular !== undefined && l.valuePerpendicular !== 0)) {
                              typeStr = `Distribuída Perpendicular${isPart ? ' (Parcial)' : ''}`;
                              valStr = `q = ${l.valuePerpendicular ?? l.valueY ?? 0} kN/m`;
                            } else {
                              typeStr = `Distribuída Global${l.isProjected ? ' (Projetada)' : ''}${isPart ? ' (Parcial)' : ''}`;
                              valStr = l.valueX ? `qx = ${l.valueX} kN/m` : `qy = ${l.valueY || 0} kN/m`;
                            }
                          } else if (isNodal) {
                            typeStr = 'Pontual no Nó';
                            valStr = `Fx = ${l.valueX || 0} kN, Fy = ${l.valueY || 0} kN`;
                          } else if (isMom) {
                            typeStr = 'Momento Concentrado';
                            valStr = `Mz = ${l.valueMoment || 0} kNm`;
                          }

                          let posDisplay = '-';
                          if (isPointBar) {
                            posDisplay = `${(l.position !== undefined ? l.position : 0).toFixed(2)} m`;
                          } else if (isDist) {
                            const barOfLoad = frame.bars.find(b => b.id === l.barId);
                            let bLen = 5;
                            if (barOfLoad) {
                              const n1b = frame.nodes.find(n => n.id === barOfLoad.startNodeId);
                              const n2b = frame.nodes.find(n => n.id === barOfLoad.endNodeId);
                              if (n1b && n2b) bLen = Math.sqrt(Math.pow(n2b.x - n1b.x, 2) + Math.pow(n2b.y - n1b.y, 2));
                            }
                            const pA = Math.max(0, Math.min(bLen, l.position !== undefined ? l.position : 0));
                            const pB = Math.max(pA, Math.min(bLen, l.endPosition !== undefined ? l.endPosition : bLen));
                            posDisplay = `${pA.toFixed(2)}m → ${pB.toFixed(2)}m (${(pB - pA).toFixed(2)}m)`;
                          }

                          return (
                            <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-black text-[#1C448E]">{l.id}</td>
                              <td className="p-3">
                                {typeStr}
                              </td>
                              <td className="p-3">
                                {l.nodeId ? `Nó ${l.nodeId}` : `Barra ${l.barId}`}
                              </td>
                              <td className="p-3">
                                {posDisplay}
                              </td>
                              <td className="p-3 font-black text-slate-800">
                                {valStr}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedElement({ type: 'load', id: l.id })}
                                  className="px-2.5 py-1 bg-blue-50 text-[#1C448E] hover:bg-blue-100 rounded-lg text-xs font-black uppercase transition-colors"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHARE / EXPORT CODE MODAL */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-[#1C448E] rounded-2xl">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C448E] uppercase tracking-tight">
                      Compartilhar Estrutura do Pórtico
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      Gere um código ou link para enviar a outro usuário
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Structure Summary Pill */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Nós</span>
                  <p className="text-sm font-black text-[#1C448E]">{frame.nodes.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Barras</span>
                  <p className="text-sm font-black text-[#1C448E]">{frame.bars.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Apoios</span>
                  <p className="text-sm font-black text-[#1C448E]">{frame.supports.length}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Cargas</span>
                  <p className="text-sm font-black text-[#1C448E]">{frame.loads.length}</p>
                </div>
              </div>

              {/* Code Box */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Código do Pórtico (Copie e envie):
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={encodeFrameCode(frame)}
                    rows={4}
                    className="w-full p-3 font-mono text-[11px] bg-slate-900 text-sky-300 rounded-2xl border border-slate-800 outline-none select-all break-all resize-none shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Copy Code */}
                <button
                  type="button"
                  onClick={() => {
                    const code = encodeFrameCode(frame);
                    navigator.clipboard?.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2500);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1C448E] text-white hover:bg-[#15346d]'
                  }`}
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Código Copiado!' : 'Copiar Código'}</span>
                </button>

                {/* Copy Direct Link */}
                <button
                  type="button"
                  onClick={() => {
                    const code = encodeFrameCode(frame);
                    const link = `${window.location.origin}${window.location.pathname}#portico=${code}`;
                    navigator.clipboard?.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${
                    copiedLink
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {copiedLink ? <Check size={16} /> : <Link2 size={16} />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                {/* Download File */}
                <button
                  type="button"
                  onClick={() => {
                    const payload = {
                      v: 1,
                      name: 'Portico Estrutural',
                      exportDate: new Date().toISOString(),
                      frame
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `portico_${Date.now()}.portico`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={16} />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMPORT PORTICO MODAL */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-50 text-[#0084CA] rounded-2xl">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C448E] uppercase tracking-tight">
                      Importar e Recriar Pórtico
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      Cole o código gerado por outro usuário ou carregue um arquivo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Paste Code Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Cole o Código ou JSON:
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard?.readText();
                        if (text) {
                          setImportInputText(text);
                          setImportError(null);
                        }
                      } catch {
                        // ignore clipboard read permission error
                      }
                    }}
                    className="text-[11px] font-black text-[#0084CA] hover:underline flex items-center gap-1"
                  >
                    <Copy size={12} /> Colar da Área de Transferência
                  </button>
                </div>

                <textarea
                  value={importInputText}
                  onChange={(e) => {
                    setImportInputText(e.target.value);
                    setImportError(null);
                  }}
                  placeholder="Cole aqui o código começando com PORTICO-... ou o JSON da estrutura"
                  rows={5}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#0084CA] focus:bg-white transition-all resize-none shadow-inner"
                />
              </div>

              {/* Upload File Alternative */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <FileJson size={18} className="text-[#1C448E]" />
                  <span>Ou carregue um arquivo <strong>.portico</strong> / <strong>.json</strong>:</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".portico,.json,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const content = evt.target?.result as string;
                      if (content) {
                        try {
                          const parsed = JSON.parse(content);
                          if (parsed.frame) {
                            setImportInputText(encodeFrameCode(parsed.frame));
                          } else {
                            setImportInputText(content);
                          }
                          setImportError(null);
                        } catch {
                          setImportInputText(content);
                        }
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black text-[#1C448E] transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  Selecionar Arquivo
                </button>
              </div>

              {/* Live Validation Banner */}
              {(() => {
                if (!importInputText.trim()) return null;
                const decoded = decodeFrameCode(importInputText);
                if (decoded && decoded.nodes && decoded.nodes.length > 0) {
                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      <div>
                        Pórtico válido detectado! ({decoded.nodes.length} nós, {decoded.bars.length} barras, {decoded.supports.length} apoios, {decoded.loads.length} cargas).
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-bold animate-in fade-in">
                      <AlertCircle size={18} className="shrink-0 text-red-600" />
                      <div>Código inválido ou corrompido. Verifique o texto colado.</div>
                    </div>
                  );
                }
              })()}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-xs font-bold">
                  <AlertCircle size={18} className="shrink-0 text-red-600" />
                  <div>{importError}</div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!importInputText.trim()) {
                      setImportError('Por favor, cole o código do pórtico.');
                      return;
                    }
                    const decoded = decodeFrameCode(importInputText);
                    if (decoded && decoded.nodes && decoded.nodes.length > 0) {
                      setFrame(decoded);
                      setIsImportModalOpen(false);
                      setImportInputText('');
                      setImportError(null);
                      setSelectedElement(null);
                      setIsAdding(null);
                    } else {
                      setImportError('Não foi possível reconhecer o pórtico neste código. Verifique e tente novamente.');
                    }
                  }}
                  className="px-5 py-2.5 bg-[#0084CA] hover:bg-[#006ca7] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  <span>Carregar e Recriar Pórtico</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FrameAnalysis;
