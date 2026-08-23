import React, { useState } from 'react';
import { Lock, User as UserIcon, Hammer, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-[#1C448E] p-8 text-center text-white">
          <div className="relative flex items-center justify-center w-20 h-20 overflow-hidden rounded-2xl bg-[#0084CA] shadow-lg border border-white/20 mx-auto mb-4">
            <span className="text-6xl text-white select-none" style={{ fontFamily: "'Pirata One', cursive" }}>
              B
            </span>
          </div>
          <h1 className="text-2xl font-bold">Ben-Hur Concreto</h1>
          <p className="text-blue-200 text-sm mt-1">Soli Deo Gloria</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0084CA] focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#0084CA] focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm animate-shake">
              <AlertCircle size={18} />
              Usuário ou senha incorretos.
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#1C448E] hover:bg-[#163672] text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md active:scale-[0.98]"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default Login;