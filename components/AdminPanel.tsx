import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Users, Shield, Key, AlertCircle, Share2, Download, Upload, CheckCircle2 } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (id: string) => void;
  onImportUsers: (users: User[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onAddUser, onDeleteUser, onImportUsers }) => {
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [importCode, setImportCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUsername)) {
      setError('Este nome de usuário já existe.');
      return;
    }
    
    onAddUser({
      name: newName,
      username: newUsername,
      password: newPassword,
      role: UserRole.NORMAL
    });
    
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setError('');
  };

  const handleExport = () => {
    const data = JSON.stringify(users.filter(u => u.role !== UserRole.ADMIN));
    const code = btoa(data); // Codifica em base64 para evitar quebras de caracteres
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const handleImport = () => {
    try {
      const decoded = atob(importCode.trim());
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        onImportUsers(parsed);
        setImportSuccess(true);
        setImportCode('');
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("Código de sincronização inválido. Certifique-se de que copiou o código completo.");
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      
      {/* Coluna Esquerda: Cadastro e Sincronização */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Cadastro Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100">
            <h3 className="text-lg font-bold text-[#1C448E] flex items-center gap-2">
              <UserPlus size={20} className="text-[#0084CA]" /> 
              Novo Usuário
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0084CA] outline-none"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nome de Usuário</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0084CA] outline-none"
                placeholder="ex: joaosilva"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Senha de Acesso</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0084CA] outline-none"
                placeholder="Senha"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#1C448E] hover:bg-[#163672] text-white font-bold py-2 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> Criar Credencial
            </button>
          </form>
        </div>

        {/* Sincronização / Backup */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100">
            <h3 className="text-lg font-bold text-[#1C448E] flex items-center gap-2">
              <Share2 size={20} className="text-[#0084CA]" /> 
              Sincronização
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Usar em outro dispositivo</p>
          </div>
          <div className="p-6 space-y-4">
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[11px] text-blue-800 leading-relaxed mb-3">
                Para usar no celular, clique em <strong>Exportar</strong> e envie o código para você. Depois, cole o código aqui no outro aparelho.
              </p>
              
              <button
                onClick={handleExport}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                  copySuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                {copySuccess ? (
                  <><CheckCircle2 size={16} /> Código Copiado!</>
                ) : (
                  <><Download size={16} /> Exportar Código</>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Importar de outro aparelho:</label>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Cole o código aqui..."
                className="w-full h-20 p-2 text-[10px] font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0084CA] outline-none resize-none bg-slate-50"
              />
              <button
                onClick={handleImport}
                disabled={!importCode.trim()}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${
                  importSuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50'
                }`}
              >
                {importSuccess ? (
                  <><CheckCircle2 size={16} /> Sincronizado!</>
                ) : (
                  <><Upload size={16} /> Aplicar Código</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#1C448E] flex items-center gap-2">
              <Users size={20} className="text-[#0084CA]" /> 
              Usuários Cadastrados
            </h3>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
              {users.length} Total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Nível</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-blue-600 font-bold">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{user.name}</td>
                    <td className="px-6 py-4">
                      {user.role === UserRole.ADMIN ? (
                        <span className="flex items-center gap-1 text-yellow-600 font-bold">
                          <Shield size={14} /> Master
                        </span>
                      ) : (
                        <span className="text-slate-500">Normal</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.role !== UserRole.ADMIN ? (
                        <button
                          onClick={() => onDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
                          title="Remover Usuário"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Inexcluível</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;