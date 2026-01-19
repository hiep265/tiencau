
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, BadmintonSession, FundTransaction } from './types';
import { Icons } from './constants';
import SessionForm from './components/SessionForm';
import FundForm from './components/FundForm';
import SummaryView from './components/SummaryView';
import TransactionList from './components/TransactionList';
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'badminton_manager_data_v1';
const DB_CONFIG_KEY = 'badminton_db_config';
const INITIAL_MEMBERS = ['Hiệp', 'Tiến', 'Băng', 'Nhung'];

const App: React.FC = () => {
  // --- STATE DỮ LIỆU ---
  const [data, setData] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.members) parsed.members = INITIAL_MEMBERS;
      return parsed;
    }
    return { sessions: [], fundTransactions: [], members: INITIAL_MEMBERS };
  });

  // --- STATE DATABASE ---
  // Tự động lấy từ env nếu có, nếu không thì lấy từ localStorage
  const [dbConfig, setDbConfig] = useState(() => {
    const saved = localStorage.getItem(DB_CONFIG_KEY);
    const parsed = saved ? JSON.parse(saved) : { url: '', key: '', groupId: 'my-badminton-group' };
    
    return {
      url: parsed.url || (process.env.SUPABASE_URL || ''),
      key: parsed.key || (process.env.SUPABASE_ANON_KEY || ''),
      groupId: parsed.groupId || 'my-badminton-group'
    };
  });
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

  // Khởi tạo Supabase client
  const supabase = useMemo(() => {
    if (dbConfig.url && dbConfig.key) {
      try {
        return createClient(dbConfig.url, dbConfig.key);
      } catch (e) {
        console.error("Supabase Init Error:", e);
        return null;
      }
    }
    return null;
  }, [dbConfig.url, dbConfig.key]);

  // --- SYNC LOGIC ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(dbConfig));
  }, [dbConfig]);

  const pushToCloud = useCallback(async (latestData: AppState) => {
    if (!supabase || !dbConfig.groupId) return;
    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('badminton_sync')
        .upsert({ id: dbConfig.groupId, data: latestData, updated_at: new Date() });
      
      if (error) throw error;
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Push error:', err);
      setSyncStatus('error');
    }
  }, [supabase, dbConfig.groupId]);

  const pullFromCloud = useCallback(async () => {
    if (!supabase || !dbConfig.groupId) return;
    setSyncStatus('syncing');
    try {
      const { data: cloudData, error } = await supabase
        .from('badminton_sync')
        .select('data')
        .eq('id', dbConfig.groupId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (cloudData) {
        setData(cloudData.data);
        setSyncStatus('success');
      } else {
        await pushToCloud(data);
      }
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error('Pull error:', err);
      setSyncStatus('error');
    }
  }, [supabase, dbConfig.groupId, pushToCloud]);

  useEffect(() => {
    if (supabase) pullFromCloud();
  }, [supabase, pullFromCloud]);

  // --- CALCULATIONS ---
  const totalFund = useMemo(() => {
    return data.fundTransactions.reduce((acc, curr) => {
      if (curr.type === 'CONTRIBUTION') return acc + curr.amount;
      if ((curr.type === 'PREPAID_PURCHASE' || curr.type === 'EXPENSE') && curr.payer === 'Quỹ') {
        return acc - curr.amount;
      }
      return acc;
    }, 0);
  }, [data.fundTransactions]);

  const memberDebts = useMemo(() => {
    const debts: Record<string, number> = {};
    data.members.forEach(p => debts[p] = 0);
    data.sessions.forEach(s => {
      if (s.payers.court !== 'Quỹ' && data.members.includes(s.payers.court)) debts[s.payers.court] += s.costs.court;
      if (s.payers.water !== 'Quỹ' && data.members.includes(s.payers.water)) debts[s.payers.water] += s.costs.water;
      if (s.payers.shuttle !== 'Quỹ' && data.members.includes(s.payers.shuttle)) debts[s.payers.shuttle] += s.costs.shuttle;
    });
    data.fundTransactions.forEach(tx => {
      if (tx.type === 'PREPAID_PURCHASE' && tx.payer !== 'Quỹ' && data.members.includes(tx.payer)) {
        debts[tx.payer] += tx.amount;
      }
    });
    return debts;
  }, [data.sessions, data.members, data.fundTransactions]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'summary' | 'sessions' | 'fund'>('summary');
  const [showModal, setShowModal] = useState<'session' | 'contribution' | 'prepaid' | null>(null);
  const [editingSession, setEditingSession] = useState<BadmintonSession | null>(null);
  // Add missing state variables to track AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // --- ACTIONS ---
  const updateAndSync = (newData: AppState) => {
    setData(newData);
    pushToCloud(newData);
  };

  const addMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || data.members.includes(trimmed)) return;
    updateAndSync({ ...data, members: [...data.members, trimmed] });
  };

  const removeMember = (name: string) => {
    if (name === 'Quỹ') return;
    if (!confirm(`Xóa ${name}?`)) return;
    updateAndSync({ ...data, members: data.members.filter(m => m !== name) });
  };

  const addSession = (session: BadmintonSession) => {
    let totalCashOut = 0;
    if (session.payers.court === 'Quỹ' && !session.isPrepaid.court) totalCashOut += session.costs.court;
    if (session.payers.water === 'Quỹ' && !session.isPrepaid.water) totalCashOut += session.costs.water;
    if (session.payers.shuttle === 'Quỹ' && !session.isPrepaid.shuttle) totalCashOut += session.costs.shuttle;
    
    const newTx: FundTransaction[] = totalCashOut > 0 ? [{
      id: `tx-session-${session.id}`,
      date: session.date,
      amount: totalCashOut,
      payer: 'Quỹ',
      type: 'EXPENSE',
      description: `Chi ngày ${session.date}`,
      category: 'general'
    }] : [];

    updateAndSync({
      ...data,
      sessions: [session, ...data.sessions],
      fundTransactions: [...newTx, ...data.fundTransactions]
    });
    setShowModal(null);
  };

  const deleteSession = (id: string) => {
    if (!confirm('Xóa buổi chơi này?')) return;
    updateAndSync({
      ...data,
      sessions: data.sessions.filter(s => s.id !== id),
      fundTransactions: data.fundTransactions.filter(tx => tx.id !== `tx-session-${id}`)
    });
  };

  const deleteFundTransaction = (id: string) => {
    if (!confirm('Xóa giao dịch này?')) return;
    updateAndSync({
      ...data,
      fundTransactions: data.fundTransactions.filter(tx => tx.id !== id)
    });
  };

  const addFundTransaction = (tx: FundTransaction) => {
    updateAndSync({ ...data, fundTransactions: [tx, ...data.fundTransactions] });
    setShowModal(null);
  };

  // Fix: Initialized GoogleGenAI correctly and used setAiAnalysis/setIsAnalyzing
  const analyzeWithAI = async () => {
    if (!process.env.API_KEY) {
      setAiAnalysis("Vui lòng cấu hình API_KEY trong biến môi trường để dùng tính năng này.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Phân tích quỹ cầu lông: Quỹ ${totalFund.toLocaleString()} VNĐ, Nợ: ${JSON.stringify(memberDebts)}. Trả lời vui vẻ, ngắn gọn bằng tiếng Việt.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiAnalysis(response.text || 'Không có phản hồi.');
    } catch (err) { setAiAnalysis('Lỗi AI.'); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto bg-slate-50 relative shadow-xl overflow-hidden">
      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-30">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Badminton Master</h1>
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : 
              syncStatus === 'error' ? 'bg-red-500' : 
              syncStatus === 'success' ? 'bg-green-400 sync-active' : 'bg-white/20'
            }`} title="Trạng thái đồng bộ" />
          </div>
          <div className="flex gap-2">
            <button onClick={pullFromCloud} title="Tải dữ liệu mới nhất" className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-90 transition-transform">🔄</button>
            <button onClick={analyzeWithAI} className="p-2 bg-indigo-500 rounded-full hover:bg-indigo-400 transition-colors shadow-md active:scale-95">✨</button>
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <p className="text-indigo-100 text-sm font-medium">Tổng tiền quỹ còn lại</p>
          <p className="text-3xl font-black mt-1">{totalFund.toLocaleString()} <span className="text-lg font-normal">VNĐ</span></p>
        </div>
      </header>

      <main className="p-4 mt-2">
        {activeTab === 'summary' && (
          <SummaryView 
            data={data} 
            memberDebts={memberDebts}
            aiAnalysis={aiAnalysis} 
            isAnalyzing={isAnalyzing} 
            onAddMember={addMember}
            onRemoveMember={removeMember}
            dbConfig={dbConfig}
            setDbConfig={setDbConfig}
          />
        )}
        {activeTab === 'sessions' && <TransactionList items={data.sessions} type="session" onDelete={deleteSession} />}
        {activeTab === 'fund' && <TransactionList items={data.fundTransactions} type="fund" onDelete={deleteFundTransaction} />}
      </main>

      <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
        <button onClick={() => setShowModal('prepaid')} className="bg-emerald-500 text-white p-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold active:scale-95 transition-transform">
          <Icons.Wallet /> Mua trả trước
        </button>
        <button onClick={() => { setEditingSession(null); setShowModal('session'); }} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform">
          <Icons.Plus />
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 flex justify-around p-3 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('summary')} className={`flex flex-col items-center gap-1 ${activeTab === 'summary' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className="w-6 h-6"><Icons.History /></div>
          <span className="text-[10px] font-bold">Tổng quan</span>
        </button>
        <button onClick={() => setActiveTab('sessions')} className={`flex flex-col items-center gap-1 ${activeTab === 'sessions' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className="w-6 h-6"><Icons.Plus /></div>
          <span className="text-[10px] font-bold">Lịch sử chơi</span>
        </button>
        <button onClick={() => setActiveTab('fund')} className={`flex flex-col items-center gap-1 ${activeTab === 'fund' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className="w-6 h-6"><Icons.Wallet /></div>
          <span className="text-[10px] font-bold">Lịch sử quỹ</span>
        </button>
        <button onClick={() => setShowModal('contribution')} className="flex flex-col items-center gap-1 text-emerald-600 active:scale-95 transition-transform">
          <div className="w-6 h-6"><Icons.Check /></div>
          <span className="text-[10px] font-bold">Đóng quỹ</span>
        </button>
      </nav>

      {showModal === 'session' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-in fade-in backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Ghi buổi chơi mới</h2>
              <button onClick={() => setShowModal(null)} className="text-slate-400 p-2">✕</button>
            </div>
            <SessionForm members={data.members} onSubmit={addSession} />
          </div>
        </div>
      )}

      {showModal === 'contribution' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Đóng quỹ</h2>
              <button onClick={() => setShowModal(null)} className="text-slate-400 p-2">✕</button>
            </div>
            <FundForm type="CONTRIBUTION" members={data.members} onSubmit={addFundTransaction} />
          </div>
        </div>
      )}

      {showModal === 'prepaid' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Mua trả trước</h2>
              <button onClick={() => setShowModal(null)} className="text-slate-400 p-2">✕</button>
            </div>
            <FundForm type="PREPAID_PURCHASE" members={data.members} onSubmit={addFundTransaction} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
