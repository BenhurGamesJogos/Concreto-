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
import { Loader2, Database, Cloud, Hammer } from 'lucide-react';

// Credenciais atualizadas com as chaves enviadas pelo usuário
const supabaseUrl = 'https://dcynowriyzuygrzftrnf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeW5vd3JpeXp1eWdyemZ0cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDAwNzYsImV4cCI6MjA4NTg3NjA3Nn0.z_pdCoLGyz0kR6p6zShlxVoJ7I2YgMTwzTjJ-WyckAw';
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
  const [isOnline, setIsOnline] = useState(false);
  
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
        
        const filteredUsers = dbUsers.filter(u => u.username !== ADMIN_USER.username);
        setUsers([ADMIN_USER, ...filteredUsers]);
        setIsOnline(true);
      }
    } catch (err: any) {
      setIsOnline(false);
      setUsers([ADMIN_USER]);
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
    const newUser = { id: Math.random().toString(36).substr(2, 9), ...userData };
    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      setUsers(prev => [...prev, newUser as User]);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === ADMIN_USER.id) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleImportUsers = async (importedUsers: User[]) => {
    const toImport = importedUsers.filter(u => u.id !== ADMIN_USER.id);
    if (toImport.length === 0) return;
    try {
      const { error } = await supabase.from('users').upsert(toImport);
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      setUsers(prev => {
        const existingIds = new Set(prev.map(u => u.id));
        const newOnes = toImport.filter(u => !existingIds.has(u.id));
        return [...prev, ...newOnes];
      });
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="bg-[#1C448E] p-4 rounded-2xl shadow-xl">
            <Hammer size={48} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#1C448E] tracking-tight uppercase italic">Ben-Hur Concreto</h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 text-[#0084CA] animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Iniciando</span>
            </div>
          </div>
        </div>
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
          
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-[#1C448E] tracking-tighter uppercase italic">
              {showAdminView ? 'Gerenciamento' : 'Cálculo de Dosagem'}
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

      <footer className="bg-[#1C448E] text-white py-12 mt-16 text-center px-4 border-t-4 border-[#0084CA]">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex justify-center gap-2 mb-4 opacity-50">
            <Database size={16} />
            <div className="h-4 w-px bg-white/20"></div>
            <Cloud size={16} />
          </div>
          <p className="text-sm font-light opacity-60">
            Algoritmo de Dosagem UFRN • Desenvolvido por Ben-Hur Ribeiro
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