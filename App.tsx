import React, { useState, useEffect } from 'react';
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

const ADMIN_USER: User = {
  id: 'admin-0',
  username: 'solideogloria',
  password: 'yeshuasavesbro',
  name: 'Administrador Master',
  role: UserRole.ADMIN
};

const USERS_STORAGE_KEY = 'benhur_concreto_persistent_users';

function App() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Garante que o administrador master sempre exista e concatena os salvos
        const otherUsers = Array.isArray(parsed) ? parsed.filter((u: User) => u.id !== ADMIN_USER.id) : [];
        return [ADMIN_USER, ...otherUsers];
      }
    } catch (e) {
      console.warn("Erro ao carregar usuários do LocalStorage", e);
    }
    return [ADMIN_USER];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const session = sessionStorage.getItem('benhur_current_user');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });

  const [showAdminView, setShowAdminView] = useState(false);

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

  const [results, setResults] = useState<DosageResults | null>(null);

  // Escuta mudanças em outras abas para manter a lista de usuários sincronizada
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USERS_STORAGE_KEY) {
        try {
          const saved = e.newValue ? JSON.parse(e.newValue) : [];
          setUsers([ADMIN_USER, ...saved]);
        } catch (err) {
          console.error("Erro na sincronização de abas", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveUsersToStorage = (updatedList: User[]) => {
    try {
      const toSave = updatedList.filter(u => u.id !== ADMIN_USER.id);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error("Não foi possível salvar os usuários", e);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem('benhur_current_user', JSON.stringify(user));
    } catch (e) {
      console.warn("Falha ao salvar sessão", e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAdminView(false);
    try {
      sessionStorage.removeItem('benhur_current_user');
    } catch (e) {
      console.warn("Falha ao limpar sessão", e);
    }
  };

  const handleAddUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9)
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
  };

  const handleDeleteUser = (id: string) => {
    if (id === ADMIN_USER.id) return;
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
  };

  const handleCalculate = () => {
    try {
      const res = calculateDosage(inputs);
      setResults(res);
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      alert("Erro no cálculo. Verifique os dados.");
    }
  };

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
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1C448E]">
              {showAdminView ? 'Painel Administrativo' : 'Ben-Hur Concreto'}
            </h2>
            <p className="text-slate-500 mt-2">
              {showAdminView 
                ? 'Gerenciamento de acessos e credenciais de usuários' 
                : 'Método de dosagem racional com correção de umidade e volume'}
            </p>
          </div>

          {showAdminView && currentUser.role === UserRole.ADMIN ? (
            <AdminPanel 
              users={users} 
              onAddUser={handleAddUser} 
              onDeleteUser={handleDeleteUser} 
            />
          ) : (
            <div className="grid lg:grid-cols-12 gap-8">
              <div className={`lg:col-span-${results ? '5' : '12'} transition-all duration-500`}>
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

      <footer className="bg-[#1C448E] text-white py-8 mt-12 text-center px-4">
        <div className="max-w-2xl mx-auto space-y-1">
          <p className="text-sm font-medium">
            Este aplicativo é uma ferramenta de apoio educacional.
          </p>
          <p className="text-xs opacity-70">
            Desenvolvido por Ben-Hur Ribeiro - UFRN
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;