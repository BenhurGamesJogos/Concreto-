import React from 'react';
import { DosageResults } from '../types';

interface PDFExportProps {
  results: DosageResults;
  id?: string;
}

export const PDFExport: React.FC<PDFExportProps> = ({ results, id }) => {
  const today = new Date().toLocaleDateString('pt-BR');
  
  const formatNum = (val: number, decimals = 2) => 
    val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const colors = {
    primary: '#1e3a8a',
    text: '#111827',
    muted: '#4b5563',
    border: '#d1d5db',
    line: '#e5e7eb'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '30px',
    paddingBottom: '15px',
    borderBottom: `1px solid ${colors.line}`
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '15px',
    display: 'block'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px'
  };

  const labelStyle: React.CSSProperties = {
    color: colors.muted,
    fontWeight: '500'
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: colors.text
  };

  return (
    <div 
      id={id} 
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '800px',
        padding: '60px 80px',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: colors.text,
        lineHeight: '1.6'
      }}
    >
      {/* HEADER */}
      <div style={{ borderBottom: `3px solid ${colors.primary}`, paddingBottom: '20px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: colors.primary, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            Ben-Hur Concreto
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Relatório Técnico de Dosagem de Concreto
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: colors.muted }}>EMISSÃO</p>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: colors.text }}>{today}</p>
        </div>
      </div>

      {/* BODY CONTENT - TEXTUAL FORMAT */}
      
      {/* SECTION 1: ESPECIFICAÇÕES */}
      <div style={sectionStyle}>
        <span style={titleStyle}>1. Especificações do Projeto</span>
        <div style={rowStyle}>
          <span style={labelStyle}>Resistência Característica (Fck):</span>
          <span style={valueStyle}>{results.fck} MPa</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Consistência (Slump):</span>
          <span style={valueStyle}>{results.slump} mm</span>
        </div>
      </div>

      {/* SECTION 2: PROPORÇÕES UNITÁRIAS */}
      <div style={sectionStyle}>
        <span style={titleStyle}>2. Proporções de Mistura (Traço Unitário)</span>
        <p style={{ fontSize: '14px', marginBottom: '15px', color: colors.muted }}>
          As proporções abaixo representam o traço unitário seco para os materiais informados.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase', color: colors.muted }}>Traço em Massa (Peso):</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: colors.primary, backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
            1 : {formatNum(results.weightTrace.sand)} : {formatNum(results.weightTrace.gravel)} / a/c: {formatNum(results.weightTrace.water)}
          </p>
        </div>

        <div>
          <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase', color: colors.muted }}>Traço em Volume:</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: colors.primary, backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
            1 : {formatNum(results.traceRatio.sand)} : {formatNum(results.traceRatio.gravel)} / Água: {formatNum(results.traceRatio.water)} L
          </p>
        </div>
      </div>

      {/* SECTION 3: FICHA DE CAMPO */}
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
        <span style={titleStyle}>3. Instruções para o Canteiro (Ficha de Campo)</span>
        <p style={{ fontSize: '14px', marginBottom: '20px' }}>
          As quantidades abaixo foram calculadas para a mistura de <strong>01 saco de cimento (50kg)</strong>, considerando a correção da umidade da areia.
        </p>

        <div style={{ border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '20px', backgroundColor: '#f9fafb' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '8px' }}>
            Dimensões da Padiola: {results.padiolas.sand.width} cm x {results.padiolas.sand.length} cm (Base)
          </p>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '14px', margin: '0 0 5px 0' }}>
              <strong>• Areia:</strong> Medir <strong>{results.padiolas.sand.count}</strong> {results.padiolas.sand.count === 1 ? 'padiola' : 'padiolas'} com altura de <strong>{results.padiolas.sand.height.toFixed(1)} cm</strong>.
            </p>
            <p style={{ fontSize: '14px', margin: '0 0 5px 0' }}>
              <strong>• Brita:</strong> Medir <strong>{results.padiolas.gravel.count}</strong> {results.padiolas.gravel.count === 1 ? 'padiola' : 'padiolas'} com altura de <strong>{results.padiolas.gravel.height.toFixed(1)} cm</strong>.
            </p>
            <p style={{ fontSize: '16px', margin: '15px 0 0 0', color: colors.primary }}>
              <strong>• Água:</strong> Adicionar <strong>{formatNum(results.sackTrace.waterVolumePerSack, 1)} Litros</strong> de água por saco de cimento.
            </p>
          </div>
        </div>
        
        <p style={{ fontSize: '11px', color: colors.muted, marginTop: '20px', fontStyle: 'italic' }}>
          Nota: O volume de água já contempla a correção pela umidade da areia informada. Recomenda-se o ajuste final da trabalhabilidade através do ensaio de abatimento (Slump Test) no início da concretagem.
        </p>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${colors.border}`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '10px', color: colors.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Ben-Hur Ribeiro
        </p>
      </div>
    </div>
  );
};
