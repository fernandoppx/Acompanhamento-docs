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
  where
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { db, auth } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/errorHandler';
import { Candidate, CandidateDocument, DocStatus } from './types';
import { REQUIRED_DOCUMENTS } from './constants';

function getDelay(requestedDate: Date | null, sentDate: Date | null, status: DocStatus) {
  if (!requestedDate) return 0;
  const start = startOfDay(requestedDate);
  const end = status === 'ENVIADO' && sentDate ? startOfDay(sentDate) : startOfDay(new Date());
  const diff = differenceInDays(end, start);
  return diff < 0 ? 0 : diff;
}

// --- Authentication View ---
const LoginView = () => {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary opacity-5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-primary opacity-5 blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center mx-auto mb-6 p-2 shadow-inner">
            <img src="/input_file_2.png" alt="Monster Docs Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 uppercase italic flex items-center justify-center gap-2">
            MONSTER <span className="text-brand-primary">DOCS</span>
          </h1>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em]">Franchise Document Management</p>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Acessar com Google
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
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

  const handleAddCandidate = async () => {
    if (!newCandidateName.trim()) return;
    
    try {
      const candidateRef = await addDoc(collection(db, 'candidates'), {
        name: newCandidateName,
        status: 'Active',
        synthesis: '',
        meetingLink: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Initialize documents using subcollection
      for (const docName of REQUIRED_DOCUMENTS) {
        await addDoc(collection(db, 'candidates', candidateRef.id, 'documents'), {
          type: docName,
          status: 'SOLICITADO',
          requestedDate: serverTimestamp(),
          sentDate: null,
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
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/input_file_1.png" className="w-8 h-8 object-contain" alt="Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-xl font-black uppercase italic tracking-tighter">MONSTER <span className="text-brand-primary">DOCS</span></h1>
          </div>
        </div>

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
            <button
              key={candidate.id}
              onClick={() => setSelectedCandidateId(candidate.id)}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedCandidateId === candidate.id 
                  ? 'bg-brand-primary/10 border-brand-primary/50 text-white' 
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <div className="font-bold mb-1 truncate">{candidate.name}</div>
              <div className="text-xs opacity-60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(candidate.createdAt, 'dd/MM/yyyy')}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 mb-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt="" />
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
            {activeCandidate ? (
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

// --- Candidate Detail Component ---
function CandidateDetail({ candidate, onDelete }: { candidate: Candidate; onDelete: () => void }) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [synthesis, setSynthesis] = useState(candidate.synthesis);
  const [meetingLink, setMeetingLink] = useState(candidate.meetingLink);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'candidates', candidate.id, 'documents'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const d = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedDate: doc.data().requestedDate?.toDate() || null,
        sentDate: doc.data().sentDate?.toDate() || null,
      } as CandidateDocument));
      // Sort alphabetically for consistency
      setDocs(d.sort((a, b) => a.type.localeCompare(b.type)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `candidates/${candidate.id}/documents`);
    });
    return () => unsubscribe();
  }, [candidate.id]);

  const updateCandidateInfo = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), {
        synthesis,
        meetingLink,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomDoc = async () => {
    if (!newDocName.trim()) return;
    try {
      await addDoc(collection(db, 'candidates', candidate.id, 'documents'), {
        type: newDocName,
        status: 'SOLICITADO',
        requestedDate: serverTimestamp(),
        sentDate: null,
        updatedAt: serverTimestamp(),
      });
      setNewDocName('');
      setIsAddingDoc(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `candidates/${candidate.id}/documents`);
    }
  };

  const updateDocStatus = async (docId: string, status: DocStatus) => {
    try {
      await updateDoc(doc(db, 'candidates', candidate.id, 'documents', docId), {
        status,
        sentDate: status === 'ENVIADO' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}/documents/${docId}`);
    }
  };

  const updateDocDate = async (docId: string, field: 'requestedDate' | 'sentDate', value: string) => {
    try {
      const date = value ? new Date(value) : null;
      await updateDoc(doc(db, 'candidates', candidate.id, 'documents', docId), {
        [field]: date ? Timestamp.fromDate(date) : null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}/documents/${docId}`);
    }
  };

  const handleArchiveCandidate = async () => {
    if (!confirm('Arquivar este candidato? Ele sairá da lista principal.')) return;
    try {
      await updateDoc(doc(db, 'candidates', candidate.id), {
        status: 'Archive',
        updatedAt: serverTimestamp(),
      });
      onDelete(); // Just clear the selection
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}`);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm('Tem certeza que deseja remover este candidato?')) return;
    try {
      await deleteDoc(doc(db, 'candidates', candidate.id));
      onDelete();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `candidates/${candidate.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hazard Stripe Banner */}
      <div className="h-4 bg-hazard w-full rounded-full opacity-50 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Docs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-brand-border flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-brand-primary" />
                <h3 className="font-bold uppercase tracking-wider text-sm italic">Gestão de Documentos</h3>
              </div>
              <button 
                onClick={() => setIsAddingDoc(true)}
                className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-1.5 rounded-lg hover:bg-brand-primary/20 transition-all flex items-center gap-1 uppercase italic"
              >
                <Plus className="w-3 h-3" />
                Adicionar Doc
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 text-[10px] uppercase font-bold text-zinc-500">
                    <th className="px-6 py-4">Documento</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Dias de Atraso</th>
                    <th className="px-6 py-4">Solicitado Em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {docs.map(item => {
                    const delayCount = getDelay(item.requestedDate, item.sentDate, item.status);
                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold leading-relaxed max-w-[200px] lg:max-w-xs uppercase italic tracking-tight">{item.type}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={item.status}
                            onChange={(e) => updateDocStatus(item.id, e.target.value as DocStatus)}
                            className={`text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none border border-transparent shadow-sm appearance-none cursor-pointer ${
                              item.status === 'ENVIADO' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                            }`}
                          >
                            <option value="SOLICITADO" className="bg-black">SOLICITADO</option>
                            <option value="ENVIADO" className="bg-black">ENVIADO</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold font-mono ${delayCount > 7 ? 'text-red-500' : 'text-zinc-400'}`}>
                              {delayCount} {delayCount === 1 ? 'dia' : 'dias'}
                            </span>
                            {item.status === 'ENVIADO' ? (
                               <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden w-20">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min((delayCount / 15) * 100, 100)}%` }}
                                  className={`h-full ${delayCount > 7 ? 'bg-red-500' : 'bg-brand-primary'}`}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="date" 
                            value={item.requestedDate ? format(item.requestedDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => updateDocDate(item.id, 'requestedDate', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-zinc-700/50 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-brand-primary transition-colors text-zinc-500 font-medium"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Synthesis & Meeting */}
        <div className="space-y-6">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-wider text-sm italic">Síntese da Avaliação</h3>
              <button 
                onClick={updateCandidateInfo}
                disabled={isSaving}
                className="text-xs bg-brand-primary text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Clock className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                SALVAR
              </button>
            </div>
            
            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Resumo do Perfil</label>
              <textarea 
                rows={12}
                value={synthesis}
                onChange={(e) => setSynthesis(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl p-4 text-sm font-medium leading-relaxed focus:outline-none focus:border-brand-primary transition-colors resize-none text-zinc-300"
                placeholder="Cole aqui a síntese da avaliação..."
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Link da Reunião (Fathom)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="flex-1 bg-brand-bg border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary transition-colors text-zinc-300"
                  placeholder="https://fathom.video/share/..."
                />
                {meetingLink && (
                  <a 
                    href={meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-zinc-900 text-brand-primary rounded-xl hover:bg-brand-primary/10 transition-colors border border-brand-border"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/50 border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-400 uppercase">Gestão de Status</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Mover para arquivo</p>
              </div>
              <button 
                onClick={handleArchiveCandidate}
                className="px-4 py-2 bg-zinc-900 border border-brand-border text-zinc-400 text-[10px] font-bold rounded-lg hover:text-white hover:border-zinc-700 transition-colors uppercase italic"
              >
                Arquivar Candidato
              </button>
            </div>
            <div className="h-px bg-brand-border" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-red-500/80 uppercase">Remover Registro</h4>
                <p className="text-[10px] text-zinc-600 uppercase tracking-tighter">Ação irreversível</p>
              </div>
              <button 
                onClick={handleDeleteCandidate}
                className="p-2.5 text-red-900 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors border border-red-900/10 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Document */}
      <AnimatePresence>
        {isAddingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingDoc(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-surface border border-brand-border w-full max-w-sm rounded-2xl p-8 relative z-10"
            >
              <h2 className="text-xl font-bold mb-4 uppercase italic">Novo Documento</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Nome/Tipo</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomDoc()}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
                <div className="flex gap-4 pt-2">
                   <button 
                    onClick={() => setIsAddingDoc(false)}
                    className="flex-1 py-3 border border-brand-border rounded-xl font-bold text-xs uppercase hover:bg-zinc-900 transition-colors"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={handleAddCustomDoc}
                    disabled={!newDocName.trim()}
                    className="flex-1 py-3 bg-brand-primary text-black rounded-xl font-bold text-xs uppercase hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
                  >
                    Adicionar
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
