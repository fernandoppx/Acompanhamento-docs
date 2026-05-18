import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  collectionGroup,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  UserCircle,
  LogOut, 
  Plus, 
  Search, 
  ChevronRight,
  ExternalLink,
  Save,
  CheckCircle2,
  Clock,
  Trash2,
  Menu,
  Mail,
  ArrowLeft,
  X,
  Camera,
  Fingerprint,
  Calendar,
  FileText,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db, auth } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/errorHandler';
import { Candidate, CandidateDocument } from './types';
import { REQUIRED_DOCUMENTS } from './constants';

// --- Status Toggle Component ---
function StatusToggle({ value, onChange }: { value: boolean | null, onChange: (val: boolean | null) => void }) {
  const getStyle = () => {
    if (value === true) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    if (value === false) return "bg-red-500/20 text-red-500 border-red-500/30";
    return "bg-zinc-900 border-zinc-800 text-zinc-700 hover:border-zinc-700";
  };

  const handleClick = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  return (
    <button 
      onClick={handleClick}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs transition-all ${getStyle()}`}
    >
      {value === true ? 'V' : value === false ? 'X' : ''}
    </button>
  );
}

// --- Authentication View ---
const LoginView = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso. Tente fazer login ou use outro e-mail.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('O formato do e-mail é inválido.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
      } else {
        setError('Erro na autenticação. Verifique os dados e tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
      {/* Hazard Stripes Background Element */}
      <div className="absolute inset-0 bg-hazard opacity-[0.03] scale-150 rotate-12 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-10 bg-brand-surface border border-brand-border rounded-3xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 bg-brand-primary text-black font-black text-[10px] uppercase tracking-[0.3em] mb-6 skew-x-[-12deg]">
            Access Point
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2 uppercase italic">
            MONSTER <span className="text-brand-primary">DOCS</span>
          </h1>
          <p className="text-zinc-600 font-bold text-[10px] uppercase tracking-[0.25em]">Franchise Document Control System</p>
        </div>
        
        <div className="space-y-6">
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleEmailAuth}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">E-mail</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
                placeholder="monster@franquia.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Senha</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-brand-primary text-black font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 hover:bg-brand-primary/80 transition-all disabled:opacity-50"
            >
              {isLoggingIn ? <Clock className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>

            <div className="flex flex-col gap-3 pt-2 text-center">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[10px] font-bold text-zinc-500 uppercase hover:text-brand-primary transition-colors"
              >
                {isRegistering ? 'Já tenho uma conta' : 'Criar nova conta de operador'}
              </button>
            </div>
          </motion.form>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-tight text-center flex flex-col gap-2"
              >
                <span>{error}</span>
                {error.includes('já está em uso') && isRegistering && (
                  <button 
                    type="button"
                    onClick={() => { setIsRegistering(false); setError(null); }}
                    className="text-brand-primary hover:underline"
                  >
                    Entrar com esta conta
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 pt-8 border-t border-brand-border/50 text-center">
          <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.3em]">
            © 2024 Monster Labs • Security Level 4
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'candidates'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          synthesis: data.synthesis || '',
          meetingLink: data.meetingLink || '',
          status: data.status,
          boardStatus: data.boardStatus ?? null,
          paymentDate: data.paymentDate?.toDate() || null,
          paymentValue: data.paymentValue || '',
          paymentStatus: data.paymentStatus ?? null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Candidate;
      });
      setCandidates(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'candidates');
    });

    return () => unsubscribe();
  }, [user]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteCandidate = async (id: string) => {
    try {
      // First, we need to delete the subcollection documents
      // Note: In a real app, this should be a cloud function or a batch
      // But for simplicity in rules/client, we delete the candidate doc
      // The rules allow delete candidates/{id}
      await deleteDoc(doc(db, 'candidates', id));
      if (selectedCandidateId === id) {
        setSelectedCandidateId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `candidates/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidateName.trim()) return;
    
    try {
      const candidateRef = await addDoc(collection(db, 'candidates'), {
        name: newCandidateName,
        status: 'Active',
        synthesis: '',
        meetingLink: '',
        boardStatus: null,
        paymentDate: null,
        paymentValue: '',
        paymentStatus: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Initialize documents using subcollection
      for (const docName of REQUIRED_DOCUMENTS) {
        await addDoc(collection(db, 'candidates', candidateRef.id, 'documents'), {
          type: docName,
          sentDate: null,
          sentStatus: null,
          returnedDate: null,
          returnedStatus: null,
          legalDate: null,
          legalStatus: null,
          updatedAt: serverTimestamp(),
        });
      }

      setNewCandidateName('');
      setIsAddingCandidate(false);
      setSelectedCandidateId(candidateRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'candidates');
    }
  };

  const activeCandidate = candidates.find(c => c.id === selectedCandidateId);
  const filteredCandidates = candidates.filter(c => 
    c.status === 'Active' && 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <LoginView />;

  return (
    <div className="min-h-screen bg-brand-bg flex text-white font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-brand-surface border-r border-brand-border h-screen flex flex-col overflow-hidden relative"
      >
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/input_file_1.png" className="w-8 h-8 object-contain" alt="Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-xl font-black uppercase italic tracking-tighter">MONSTER <span className="text-brand-primary">DOCS</span></h1>
          </div>
        </div>

        <div className="px-4 pt-6 space-y-1">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedCandidateId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-brand-primary text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-brand-primary text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
          >
            <UserCircle className="w-4 h-4" />
            Perfil
          </button>
        </div>

        <div className="h-px bg-brand-border my-4 mx-4" />

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar candidato..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <button 
            onClick={() => setIsAddingCandidate(true)}
            className="w-full bg-brand-primary/10 text-brand-primary border border-brand-primary/30 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Candidato
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filteredCandidates.map(candidate => (
            <div key={candidate.id} className="group relative">
              <button
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedCandidateId === candidate.id 
                    ? 'bg-brand-primary/10 border-brand-primary/50 text-white' 
                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <div className="font-bold mb-1 truncate pr-8">{candidate.name}</div>
                <div className="text-xs opacity-60 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(candidate.createdAt, 'dd/MM/yyyy')}
                </div>
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (deletingId === candidate.id) {
                    deleteCandidate(candidate.id);
                  } else {
                    setDeletingId(candidate.id);
                    setTimeout(() => setDeletingId(null), 3000);
                  }
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 transition-all opacity-0 group-hover:opacity-100 ${
                  deletingId === candidate.id ? 'text-red-500 scale-125' : 'text-zinc-700 hover:text-red-500'
                }`}
                title={deletingId === candidate.id ? "Clique novamente para confirmar" : "Excluir Candidato"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 mb-2">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <Users className="w-4 h-4 text-zinc-600" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-bold truncate">{user.displayName}</div>
              <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:text-brand-primary transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-brand-border flex items-center px-8 justify-between bg-brand-surface/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {activeCandidate && (
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-bold">{activeCandidate.name}</h2>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-500">
              {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProfileView user={user} />
              </motion.div>
            ) : activeCandidate ? (
              <motion.div
                key={activeCandidate.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <CandidateDetail 
                  candidate={activeCandidate} 
                  onDelete={() => setSelectedCandidateId(null)}
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-zinc-500"
              >
                <LayoutDashboard className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Selecione um candidato para gerenciar a documentação</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal Add Candidate */}
      <AnimatePresence>
        {isAddingCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCandidate(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-surface border border-brand-border w-full max-w-md rounded-2xl p-8 relative z-10"
            >
              <h2 className="text-2xl font-bold mb-6">Novo Candidato</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-zinc-500 mb-2 block">Nome Completo</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newCandidateName}
                    onChange={(e) => setNewCandidateName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCandidate()}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 focus:outline-none focus:border-brand-primary transition-colors"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAddingCandidate(false)}
                    className="flex-1 py-3 border border-brand-border rounded-xl font-bold hover:bg-zinc-900 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAddCandidate}
                    disabled={!newCandidateName.trim()}
                    className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
                  >
                    Criar Registro
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Profile View Component ---
function ProfileView({ user }: { user: User | null }) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await updateProfile(user, { displayName, photoURL });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      // Minor delay to show success before clearing
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-4 bg-hazard w-full rounded-full opacity-50 mb-8" />
      
      <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-brand-border bg-zinc-900/30 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20">
            <Fingerprint className="w-8 h-8 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Configurações de Perfil</h2>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Gerencie sua identidade no Monster Docs</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-brand-border group-hover:border-brand-primary transition-colors flex items-center justify-center overflow-hidden bg-brand-bg">
                {photoURL ? (
                  <img src={photoURL} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <Camera className="w-8 h-8 text-zinc-700" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-brand-primary p-2 rounded-lg shadow-lg">
                <Plus className="w-4 h-4 text-black" />
              </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Nome de Exibição</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors font-bold uppercase italic"
                  placeholder="Nome Completo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">URL da Foto de Perfil</label>
                <div className="flex gap-3">
                  <input 
                    type="url"
                    value={photoURL}
                    onChange={e => setPhotoURL(e.target.value)}
                    className="flex-1 bg-brand-bg border border-brand-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-brand-primary transition-colors font-mono"
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>
                <p className="text-[9px] text-zinc-600 uppercase font-medium">Use uma URL direta de imagem (JPG, PNG ou WEBP)</p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl text-[10px] font-black uppercase text-center tracking-widest border ${
                  message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-brand-border flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-brand-primary text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-brand-primary/80 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Aplicar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Candidate Detail Component ---
function CandidateDetail({ candidate, onDelete }: { candidate: Candidate; onDelete: () => void }) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [synthesis, setSynthesis] = useState(candidate.synthesis);
  const [meetingLink, setMeetingLink] = useState(candidate.meetingLink);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | null>(null);
  
  // Local state for candidate-level fields that are in the table
  const [paymentValue, setPaymentValue] = useState(candidate.paymentValue);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 215, 0); // Gold
    doc.setFontSize(22);
    doc.text('MONSTER DOCS', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('CONTROLE DOCUMENTAL DE FRANQUIA', 20, 30);
    
    // Candidate Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Candidato: ${candidate.name}`, 20, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Criação: ${format(candidate.createdAt, 'dd/MM/yyyy')}`, 20, 62);
    doc.text(`Status: ${candidate.status}`, 20, 69);
    
    // Documents Table
    const tableHeaders = [['Documento', 'Envio', 'ST', 'Retorno', 'ST', 'Jurídico', 'ST']];
    const tableData = docs.map(d => [
      d.type,
      d.sentDate ? format(d.sentDate, 'dd/MM/yyyy') : '-',
      d.sentStatus ? 'OK' : 'X',
      d.returnedDate ? format(d.returnedDate, 'dd/MM/yyyy') : '-',
      d.returnedStatus ? 'OK' : 'X',
      d.legalDate ? format(d.legalDate, 'dd/MM/yyyy') : '-',
      d.legalStatus ? 'OK' : 'X'
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 80,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 215, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Special Rows Info
    const lastY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS DA DIRETORIA:', 20, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(candidate.boardStatus === true ? 'APROVADO' : candidate.boardStatus === false ? 'REPROVADO' : 'PENDENTE', 80, lastY);

    doc.setFont('helvetica', 'bold');
    doc.text('DATA / VALOR DO PAGAMENTO:', 20, lastY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${candidate.paymentDate ? format(candidate.paymentDate, 'dd/MM/yyyy') : '-'} / R$ ${candidate.paymentValue || '0,00'} (${candidate.paymentStatus ? 'PAGO' : 'PENDENTE'})`, 85, lastY + 10);

    // Synthesis
    doc.setFont('helvetica', 'bold');
    doc.text('SÍNTESE DA AVALIAÇÃO:', 20, lastY + 25);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(candidate.synthesis || 'Nenhuma síntese informada.', pageWidth - 40);
    doc.text(splitText, 20, lastY + 32);

    doc.save(`Relatorio_${candidate.name.replace(/\s+/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    const data = docs.map(d => ({
      'Documento': d.type,
      'Data Envio': d.sentDate ? format(d.sentDate, 'dd/MM/yyyy') : '-',
      'Status Envio': d.sentStatus ? 'V' : 'X',
      'Data Retorno': d.returnedDate ? format(d.returnedDate, 'dd/MM/yyyy') : '-',
      'Status Retorno': d.returnedStatus ? 'V' : 'X',
      'Data Jurídico': d.legalDate ? format(d.legalDate, 'dd/MM/yyyy') : '-',
      'Status Jurídico': d.legalStatus ? 'V' : 'X'
    }));

    // Add candidate info as separate rows or sheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos');
    
    // Add Summary sheet
    const summaryData = [
      ['Candidato', candidate.name],
      ['Status Geral', candidate.status],
      ['Status Diretoria', candidate.boardStatus === true ? 'APROVADO' : 'PENDENTE'],
      ['Valor Pagamento', candidate.paymentValue],
      ['Data Pagamento', candidate.paymentDate ? format(candidate.paymentDate, 'dd/MM/yyyy') : '-'],
      ['Link Reunião', candidate.meetingLink],
      ['Síntese', candidate.synthesis]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    XLSX.writeFile(wb, `Relatorio_${candidate.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') exportToPDF();
    else exportToExcel();
    setIsExporting(false);
  };

  useEffect(() => {
    setSynthesis(candidate.synthesis);
    setMeetingLink(candidate.meetingLink);
    setPaymentValue(candidate.paymentValue);
  }, [candidate.id, candidate.synthesis, candidate.meetingLink, candidate.paymentValue]);

  useEffect(() => {
    const q = query(collection(db, 'candidates', candidate.id, 'documents'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const d = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentDate: doc.data().sentDate?.toDate() || null,
        returnedDate: doc.data().returnedDate?.toDate() || null,
        legalDate: doc.data().legalDate?.toDate() || null,
      } as CandidateDocument));
      setDocs(d.sort((a, b) => {
        // Keep sorting consistent with constants
        const idxA = REQUIRED_DOCUMENTS.indexOf(a.type);
        const idxB = REQUIRED_DOCUMENTS.indexOf(b.type);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.type.localeCompare(b.type);
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `candidates/${candidate.id}/documents`);
    });
    return () => unsubscribe();
  }, [candidate.id]);

  const updateCandidateField = async (fields: Partial<Candidate>) => {
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}`);
    }
  };

  const updateDocField = async (docId: string, field: string, value: any) => {
    try {
      let finalValue = value;
      if (typeof value === 'string' && value && !isNaN(Date.parse(value))) {
        finalValue = Timestamp.fromDate(new Date(value));
      } else if (value === '') {
        finalValue = null;
      }

      await updateDoc(doc(db, 'candidates', candidate.id, 'documents', docId), {
        [field]: finalValue,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}/documents/${docId}`);
    }
  };

  const handleArchiveCandidate = async () => {
    if (!confirm('Arquivar este candidato?')) return;
    updateCandidateField({ status: 'Archive' });
    onDelete();
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDeleteCandidate = async () => {
   if (!isConfirmingDelete) {
  setIsConfirmingDelete(true);
  setTimeout(() => setIsConfirmingDelete(false), 3000);
  return;
}

try {

  const docsRef = collection(
    db,
    'candidates',
    candidate.id,
    'documents'
  );

  const docsSnapshot = await getDocs(docsRef);

  for (const item of docsSnapshot.docs) {
    await deleteDoc(item.ref);
  }

  await deleteDoc(doc(db, 'candidates', candidate.id));

  onDelete();

} catch (error) {

  console.error(error);

  handleFirestoreError(
    error,
    OperationType.DELETE,
    `candidates/${candidate.id}`
  );
}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-brand-border flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-primary" />
            <h3 className="font-black uppercase italic tracking-tighter text-lg">Controle Documental de Franquia</h3>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
               <button 
                 onClick={() => setIsExporting(!isExporting)}
                 className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-black transition-all"
               >
                 <Download className="w-4 h-4" />
                 Gerar Relatório
               </button>
               
               <AnimatePresence>
                 {isExporting && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-brand-border rounded-xl shadow-2xl z-20 overflow-hidden"
                   >
                     <button 
                       onClick={() => handleExport('pdf')}
                       className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border-b border-brand-border/50"
                     >
                       <FileText className="w-4 h-4 text-red-500" />
                       Exportar PDF
                     </button>
                     <button 
                       onClick={() => handleExport('excel')}
                       className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                     >
                       <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                       Exportar Excel
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             <div className="flex gap-2">
                <button onClick={handleArchiveCandidate} className="p-2 transition-colors hover:text-brand-primary" title="Arquivar">
                  <LogOut className="w-5 h-5 rotate-180" />
                </button>
                <button 
                  onClick={handleDeleteCandidate} 
                  className={`p-2 transition-colors ${isConfirmingDelete ? 'text-red-500 scale-125' : 'hover:text-red-500'}`} 
                  title={isConfirmingDelete ? "Clique novamente para excluir" : "Excluir"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4 lg:p-8">
          <table className="w-full border-collapse min-w-[1000px] border border-brand-border/50">
            <thead>
              <tr className="bg-black text-[#FFD700] text-[10px] font-black uppercase tracking-widest">
                <th className="border border-brand-border/50 p-3 w-1/4 text-center">Documento</th>
                <th className="border border-brand-border/50 p-3 text-center">Data do Envio para o Cliente</th>
                <th className="border border-brand-border/50 p-3 w-12 text-center text-[8px]">ST</th>
                <th className="border border-brand-border/50 p-3 text-center">Data do retorno do documento</th>
                <th className="border border-brand-border/50 p-3 w-12 text-center text-[8px]">ST</th>
                <th className="border border-brand-border/50 p-3 text-center">Data aprovação do Jurídico</th>
                <th className="border border-brand-border/50 p-3 w-12 text-center text-[8px]">ST</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(item => (
                <tr key={item.id} className="hover:bg-zinc-900/10 transition-colors">
                  <td className="border border-brand-border/50 p-3 text-[11px] font-bold text-zinc-300 uppercase tracking-tight leading-none bg-zinc-900/20">{item.type}</td>
                  
                  {/* Data do Envio */}
                  <td className="border border-brand-border/50 p-2 group/date">
                    <div className="relative flex items-center justify-center">
                      <Calendar className="absolute left-2 w-3 h-3 text-white pointer-events-none opacity-60 group-hover/date:opacity-100 transition-opacity" />
                      <input 
                        type="date" 
                        value={item.sentDate ? format(item.sentDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateDocField(item.id, 'sentDate', e.target.value)}
                        className="w-full bg-transparent text-[11px] text-zinc-400 focus:outline-none focus:text-white text-center pl-6 cursor-pointer appearance-none date-input-white"
                      />
                    </div>
                  </td>
                  <td className="border border-brand-border/50 p-1 text-center bg-zinc-900/10">
                    <StatusToggle value={item.sentStatus} onChange={(v) => updateDocField(item.id, 'sentStatus', v)} />
                  </td>

                  {/* Data do Retorno */}
                  <td className="border border-brand-border/50 p-2 group/date">
                    <div className="relative flex items-center justify-center">
                      <Calendar className="absolute left-2 w-3 h-3 text-white pointer-events-none opacity-60 group-hover/date:opacity-100 transition-opacity" />
                      <input 
                        type="date" 
                        value={item.returnedDate ? format(item.returnedDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateDocField(item.id, 'returnedDate', e.target.value)}
                        className="w-full bg-transparent text-[11px] text-zinc-400 focus:outline-none focus:text-white text-center pl-6 cursor-pointer appearance-none date-input-white"
                      />
                    </div>
                  </td>
                  <td className="border border-brand-border/50 p-1 text-center bg-zinc-900/10">
                    <StatusToggle value={item.returnedStatus} onChange={(v) => updateDocField(item.id, 'returnedStatus', v)} />
                  </td>

                  {/* Data Aprovação Juridico */}
                  <td className="border border-brand-border/50 p-2 group/date">
                    <div className="relative flex items-center justify-center">
                      <Calendar className="absolute left-2 w-3 h-3 text-white pointer-events-none opacity-60 group-hover/date:opacity-100 transition-opacity" />
                      <input 
                        type="date" 
                        value={item.legalDate ? format(item.legalDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateDocField(item.id, 'legalDate', e.target.value)}
                        className="w-full bg-transparent text-[11px] text-zinc-400 focus:outline-none focus:text-white text-center pl-6 cursor-pointer appearance-none date-input-white"
                      />
                    </div>
                  </td>
                  <td className="border border-brand-border/50 p-1 text-center bg-zinc-900/10">
                    <StatusToggle value={item.legalStatus} onChange={(v) => updateDocField(item.id, 'legalStatus', v)} />
                  </td>
                </tr>
              ))}

              {/* Special Rows */}
              <tr className="bg-zinc-900/30">
                <td className="border border-brand-border/50 p-3 text-[11px] font-black uppercase tracking-tighter bg-zinc-900/40">STATUS DA DIRETORIA</td>
                <td colSpan={5} className="border border-brand-border/50 p-3 text-right bg-[#e2e8f0]/10">
                   <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest italic pr-4">APROVADO / REPROVADO</span>
                </td>
                <td className="border border-brand-border/50 p-1 text-center">
                  <StatusToggle value={candidate.boardStatus} onChange={(v) => updateCandidateField({ boardStatus: v })} />
                </td>
              </tr>
              <tr>
                <td className="border border-brand-border/50 p-3 text-[11px] font-black uppercase tracking-tighter">COF para assinatura do cliente</td>
                <td colSpan={6} className="border border-brand-border/50 p-3 bg-zinc-900/10"></td>
              </tr>
              <tr className="bg-zinc-900/30">
                <td className="border border-brand-border/50 p-3 text-[11px] font-black uppercase tracking-tighter">DATA / VALOR DO PAGAMENTO</td>
                <td colSpan={2} className="border border-brand-border/50 p-2 group/date">
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[9px] font-black uppercase text-zinc-600">DATA:</span>
                    <div className="relative flex-1 flex items-center">
                      <Calendar className="absolute left-2 w-3 h-3 text-white pointer-events-none opacity-60 group-hover/date:opacity-100 transition-opacity" />
                      <input 
                        type="date" 
                        value={candidate.paymentDate ? format(candidate.paymentDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => updateCandidateField({ paymentDate: e.target.value ? new Date(e.target.value) : null })}
                        className="flex-1 bg-transparent text-[11px] text-zinc-400 focus:outline-none pl-7 cursor-pointer appearance-none date-input-white"
                      />
                    </div>
                  </div>
                </td>
                <td colSpan={3} className="border border-brand-border/50 p-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[9px] font-black uppercase text-zinc-600">VALOR:</span>
                    <input 
                      type="text" 
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value)}
                      onBlur={() => updateCandidateField({ paymentValue })}
                      className="w-32 bg-transparent text-[11px] font-mono text-emerald-500 font-bold focus:outline-none text-right"
                      placeholder="100.000,00"
                    />
                  </div>
                </td>
                <td className="border border-brand-border/50 p-1 text-center">
                  <StatusToggle value={candidate.paymentStatus} onChange={(v) => updateCandidateField({ paymentStatus: v })} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Synthesis Section */}
        <div className="p-8 space-y-6 bg-zinc-900/20 border-t border-brand-border">
          <div className="space-y-4">
             <div className="flex items-center gap-3 border-l-4 border-brand-primary pl-4">
                <h4 className="text-xl font-black uppercase italic tracking-tighter">Síntese da Avaliação do Franqueado:</h4>
             </div>
             <textarea 
               value={synthesis}
               onChange={(e) => setSynthesis(e.target.value)}
               onBlur={() => updateCandidateField({ synthesis })}
               placeholder="Descreva a avaliação detalhada aqui..."
               className="w-full bg-brand-bg/50 border border-brand-border rounded-2xl p-6 text-sm text-zinc-300 leading-relaxed min-h-[300px] focus:outline-none focus:border-brand-primary transition-all resize-none shadow-inner"
             />
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">
                <ExternalLink className="w-3 h-3 text-brand-primary" /> Link da Reunião:
              </label>
              <input 
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                onBlur={() => updateCandidateField({ meetingLink })}
                className="w-full bg-brand-bg/50 border border-brand-border rounded-xl px-4 py-3 text-xs text-brand-primary font-mono focus:outline-none focus:border-brand-primary transition-all"
                placeholder="https://fathom.video/share/..."
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-8 border-t border-brand-border bg-red-500/5 rounded-b-3xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-red-500 italic tracking-tighter">Zona de Perigo</h4>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Ações irreversíveis para este registro</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleArchiveCandidate}
                className="px-6 py-3 bg-zinc-900 border border-brand-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 rotate-180" />
                Arquivar Registro
              </button>
              <button 
                onClick={handleDeleteCandidate}
                className={`px-6 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  isConfirmingDelete 
                    ? 'bg-red-500 text-black border-red-500' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {isConfirmingDelete ? 'Clique para confirmar exclusão' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
