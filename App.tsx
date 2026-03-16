import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
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
import { Loader2, Hammer } from 'lucide-react';

// Firebase Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ADMIN_USER: User = {
  id: 'admin-0',
  username: 'solideogloria',
  password: 'yeshuasavesbro',
  name: 'lindo maravilhoso',
  role: UserRole.ADMIN
};

function App() {
  const [users, setUsers] = useState<User[]>([ADMIN_USER]);
  const [loading, setLoading] = useState(true);
  
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
    structureType: StructureType.COMUM,
    padiolaWidth: 35,
    padiolaLength: 45
  });

  useEffect(() => {
    const setupAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error: any) {
        console.error("Auth error:", error);
        setLoading(false);
      }
    };

    setupAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase Auth: Authenticated as", user.uid);
        fetchUsers();
      } else {
        console.log("Firebase Auth: Not authenticated");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const dbUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        dbUsers.push({
          id: doc.id,
          username: data.username,
          password: data.password,
          name: data.name,
          role: data.role as UserRole
        });
      });
      
      const filteredUsers = dbUsers.filter(u => u.username !== ADMIN_USER.username);
      setUsers([ADMIN_USER, ...filteredUsers]);
      console.log("Firestore: Users fetched successfully. Total users:", dbUsers.length + 1);
    } catch (err: any) {
      console.error("Firestore Fetch Error:", err);
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
    const id = Math.random().toString(36).substr(2, 9);
    const newUser = { id, ...userData };
    console.log("Attempting to create user:", newUser);
    try {
      await setDoc(doc(db, 'users', id), newUser);
      console.log("User created successfully in Firestore");
      await fetchUsers();
    } catch (err: any) {
      console.error("Error creating user:", err);
      handleFirestoreError(err, OperationType.CREATE, `users/${id}`);
      setUsers(prev => [...prev, newUser as User]);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === ADMIN_USER.id) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      await fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleImportUsers = async (importedUsers: User[]) => {
    const toImport = importedUsers.filter(u => u.id !== ADMIN_USER.id);
    if (toImport.length === 0) return;
    try {
      for (const u of toImport) {
        await setDoc(doc(db, 'users', u.id), u);
      }
      await fetchUsers();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users (batch import)');
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

  const handleSaveCalculation = async () => {
    if (!results || !currentUser) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    const calculation = {
      id,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      inputs,
      results
    };

    try {
      await setDoc(doc(db, 'calculations', id), calculation);
      alert('Cálculo salvo com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `calculations/${id}`);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="relative flex items-center justify-center w-28 h-28 overflow-hidden rounded-2xl bg-[#1C448E] shadow-2xl border border-white/10">
            <span className="text-7xl text-white select-none" style={{ fontFamily: "'Pirata One', cursive" }}>
              B
            </span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#1C448E] tracking-tight uppercase">Ben-Hur Concreto</h1>
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
            <h2 className="text-4xl font-black text-[#1C448E] tracking-tighter uppercase">
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
                  <ResultsDisplay results={results} onSave={handleSaveCalculation} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-[#1C448E] text-white py-12 mt-16 text-center px-4 border-t-4 border-[#0084CA]">
        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-sm font-light opacity-60">
            Desenvolvido por Ben-Hur Ribeiro
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