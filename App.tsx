import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ResultsDisplay from './components/ResultsDisplay';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { 
  DosageInputs, 
  DosageResults, 
  CementClass, 
  ExposureCondition, 
  StructureType, 
  StandardDeviationControl,
  User,
  UserRole
} from './types';
import { calculateDosage } from './utils/dosageCalculator';
import { DEFAULT_CEMENT_SPECIFIC_MASS } from './constants';
import { Cloud, CloudOff, Database, Loader2, RefreshCw, Settings, ShieldAlert } from 'lucide-react';

// URL e Chave do Projeto Supabase
const supabaseUrl = 'https://dcynowriyzuygrzftrnf.supabase.co';
const supabaseKey = 'sb_publishable_EQzZdXsY65GxLPutRduQKw_75WuMPNM_';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_USER: User = {
  id: 'admin-0',
  username: 'solideogloria',
  password: 'yeshuasavesbro',
  name: 'Administrador Master',
  role: UserRole.ADMIN
};

function App() {
  const [users, setUsers] = useState<User[]>([ADMIN_USER]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const session = sessionStorage.getItem('benhur_current_user');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });

  const [showAdminView, setShowAdminView] = useState(false);
  const [results, setResults] = useState<DosageResults | null>(null);

  const [inputs, setInputs] = useState<DosageInputs>({
    volumeTotal: 1,
    fck: 25,
    sdControl: StandardDeviationControl.RAZOAVEL,
    slump: 60,
    cementClass: CementClass.CP_32,
    cementSpecificMass: DEFAULT_CEMENT_SPECIFIC_MASS,
    cementUnitMass: 1.4,
    dmc: 19,
    sandSpecificMass: 2.63,
    sandUnitMass: 1.5,
    sandMoisture: 3.0,
    gravelSpecificMass: 2.65,
    gravelUnitMass: 1.45,
    alphaS: 50,
    alphaM: 40,
    alphaR: 60,
    exposure: ExposureCondition.COMUM,
    structureType: StructureType.COMUM
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const dbUsers = data.map((u: any) => ({
          id: u.id,
          username: u.username,
          password: u.password,
          name: u.name,
          role: u.role as UserRole
        }));
        setUsers([ADMIN_USER, ...dbUsers]);
      }
    } catch (err: any) {
      console.error('Supabase Sync Error:', err);
      setDbError(err.message || 'Erro de sincronização.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('benhur_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAdminView(false);
    sessionStorage.removeItem('benhur_current_user');
  };

  const handleAddUser = async (userData: Omit<User, 'id'>) => {
    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData
    };
    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === ADMIN_USER.id) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleImportUsers = async (importedUsers: User[]) => {
    const toImport = importedUsers
      .filter(u => u.id !== ADMIN_USER.id)
      .map(u => ({ id: u.id, username: u.username, password: u.password, name: u.name, role: u.role }));
    if (toImport.length === 0) return;
    try {
      const { error } = await supabase.from('users').upsert(toImport);
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleCalculate = () => {
    const res = calculateDosage(inputs);
    setResults(res);
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
        <Loader2 className="w-12 h-12 text-[#1C448E] animate-spin mb-4" />
        <h2 className="text-[#1C448E] font-black text-xl tracking-tight uppercase italic">Ben-Hur Concreto</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header 
        currentUser={currentUser} 
        onLogout={handleLogout}
        showAdminPanel={showAdminView}
        onToggleAdmin={() => setShowAdminView(!showAdminView)}
      />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-[1600px] mx-auto">
          
          {/* Status de Conexão */}
          <div className="flex justify-end mb-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border transition-all ${dbError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
              {dbError ? <CloudOff size={14} /> : <Cloud size={14} className="animate-pulse" />}
              {dbError ? 'Modo Offline' : 'Nuvem Conectada'}
              <button onClick={fetchUsers} className="ml-2 hover:rotate-180 transition-transform duration-500">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-[#1C448E] tracking-tighter uppercase italic">
              {showAdminView ? 'Configurações do Sistema' : 'Calculadora de Traço'}
            </h2>
            <div className="h-1.5 w-24 bg-[#0084CA] mx-auto mt-4 rounded-full"></div>
          </div>

          {showAdminView && currentUser.role === UserRole.ADMIN ? (
            <AdminPanel 
              users={users} 
              onAddUser={handleAddUser} 
              onDeleteUser={handleDeleteUser}
              onImportUsers={handleImportUsers}
            />
          ) : (
            <div className="grid lg:grid-cols-12 gap-10">
              <div className={`lg:col-span-${results ? '5' : '12'} transition-all duration-700 ease-in-out`}>
                <InputForm 
                  inputs={inputs} 
                  onChange={setInputs} 
                  onCalculate={handleCalculate} 
                />
              </div>
              
              {results && (
                <div id="results-section" className="lg:col-span-7">
                  <ResultsDisplay results={results} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-[#1C448E] text-white py-12 mt-16 text-center px-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-sm font-light opacity-60">
            Metodologia Racional UFRN • Desenvolvido por Ben-Hur Ribeiro
          </p>
          <p className="text-[10px] font-black tracking-[0.4em] opacity-40 uppercase">
            Soli Deo Gloria &copy; 2025
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;