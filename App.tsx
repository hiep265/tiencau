
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, BadmintonSession, FundTransaction } from './types';
import { Icons } from './constants';
import SessionForm from './components/SessionForm';
import FundForm from './components/FundForm';
import SummaryView from './components/SummaryView';
import TransactionList from './components/TransactionList';
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

const INITIAL_MEMBERS = ['Hiệp', 'Tiến', 'Băng', 'Nhung'];

const App: React.FC = () => {
  // --- STATE DỮ LIỆU ---
  const [data, setData] = useState<AppState>({ sessions: [], fundTransactions: [], members: INITIAL_MEMBERS });

  // --- STATE DATABASE ---
  const [dbConfig, setDbConfig] = useState(() => ({
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    groupId: 'my-badminton-group'
  }));

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');

  // Khởi tạo Supabase client
  const supabase = useMemo(() => {
    console.log('Creating Supabase client...', { url: !!dbConfig.url, key: !!dbConfig.key });
    if (dbConfig.url && dbConfig.key) {
      try {
        const client = createClient(dbConfig.url, dbConfig.key);
        console.log('Supabase client created successfully');
        return client;
      } catch (e) {
        console.error("Supabase Init Error:", e);
        return null;
      }
    }
    console.log('Supabase not configured - missing url or key');
    return null;
  }, [dbConfig.url, dbConfig.key]);

  // --- SYNC LOGIC ---
  const pushToCloud = useCallback(async (latestData: AppState) => {
    console.log('pushToCloud called', { supabase: !!supabase, dbConfig });
    if (!supabase || !dbConfig.groupId) {
      console.warn('Supabase not configured, skipping push');
      return;
    }
    setSyncStatus('syncing');
    try {
      console.log('Pushing to Supabase...', dbConfig.groupId);
      const { error } = await supabase
        .from('badminton_sync')
        .upsert({ id: dbConfig.groupId, data: latestData, updated_at: new Date() });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Push success!');
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
      // Trừ tiền mua trả trước (dù Quỹ hay thành viên mua đều tính là chi của quỹ)
      if (curr.type === 'PREPAID_PURCHASE') return acc - curr.amount;
      // Chi phí buổi chơi từ Quỹ
      if (curr.type === 'EXPENSE' && curr.payer === 'Quỹ') return acc - curr.amount;
      return acc;
    }, 0);
  }, [data.fundTransactions]);

  // Tính số dư cá nhân của mỗi thành viên
  // Balance = Đóng góp + Tiền mua trả trước (nếu họ mua) - Phần chi phí chia đều
  const memberBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    data.members.forEach(p => balances[p] = 0);
    const memberCount = data.members.length;

    data.fundTransactions.forEach(tx => {
      // Cộng tiền đóng góp
      if (tx.type === 'CONTRIBUTION' && data.members.includes(tx.payer)) {
        balances[tx.payer] += tx.amount;
      }

      // Xử lý mua trả trước: chia đều chi phí cho tất cả thành viên
      if (tx.type === 'PREPAID_PURCHASE' && memberCount > 0) {
        // Nếu thành viên mua bằng tiền túi → họ được ghi nhận
        if (tx.payer !== 'Quỹ' && data.members.includes(tx.payer)) {
          balances[tx.payer] += tx.amount;
        }
        // Chia đều chi phí cho tất cả thành viên
        const costPerPerson = tx.amount / memberCount;
        data.members.forEach(member => {
          balances[member] -= costPerPerson;
        });
      }
    });

    // Trừ phần chi phí của mỗi người khi họ tham gia buổi chơi
    data.sessions.forEach(s => {
      const participants = s.participants || data.members; // Fallback cho data cũ
      if (participants.length === 0) return;

      const totalSessionCost = s.costs.court + s.costs.water + s.costs.shuttle;
      const costPerPerson = totalSessionCost / participants.length;

      participants.forEach(participant => {
        if (data.members.includes(participant)) {
          balances[participant] -= costPerPerson;
        }
      });
    });

    return balances;
  }, [data.sessions, data.members, data.fundTransactions]);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'summary' | 'sessions' | 'fund'>('summary');
  const [showModal, setShowModal] = useState<'session' | 'contribution' | 'prepaid' | null>(null);
  const [editingSession, setEditingSession] = useState<BadmintonSession | null>(null);
  // Add missing state variables to track AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // --- ACTIONS ---
  const updateAndSync = async (newData: AppState) => {
    setData(newData);
    if (!supabase || !dbConfig.groupId) {
      console.warn('Supabase not configured, data only saved locally');
      return;
    }
    await pushToCloud(newData);
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
    // Trừ quỹ nếu: check "Trả trước" HOẶC chọn payer là "Quỹ"
    if (session.payers.court === 'Quỹ' || session.isPrepaid.court) totalCashOut += session.costs.court;
    if (session.payers.water === 'Quỹ' || session.isPrepaid.water) totalCashOut += session.costs.water;
    if (session.payers.shuttle === 'Quỹ' || session.isPrepaid.shuttle) totalCashOut += session.costs.shuttle;

    const newTx: FundTransaction = {
      id: `tx-session-${session.id}`,
      date: session.date,
      amount: totalCashOut,
      payer: 'Quỹ',
      type: 'EXPENSE',
      description: `Chi ngày ${session.date}`,
      category: 'general'
    };

    // Kiểm tra xem đang thêm mới hay sửa
    const isEditing = editingSession !== null;

    if (isEditing) {
      // Cập nhật session cũ
      const updatedSessions = data.sessions.map(s => s.id === session.id ? session : s);
      // Cập nhật hoặc xóa fund transaction tương ứng
      let updatedFundTx = data.fundTransactions.filter(tx => tx.id !== `tx-session-${session.id}`);
      if (totalCashOut > 0) {
        updatedFundTx = [newTx, ...updatedFundTx];
      }
      updateAndSync({
        ...data,
        sessions: updatedSessions,
        fundTransactions: updatedFundTx
      });
    } else {
      // Thêm session mới
      updateAndSync({
        ...data,
        sessions: [session, ...data.sessions],
        fundTransactions: totalCashOut > 0 ? [newTx, ...data.fundTransactions] : data.fundTransactions
      });
    }

    setEditingSession(null);
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

  const editSession = (session: BadmintonSession) => {
    setEditingSession(session);
    setShowModal('session');
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
    if (!import.meta.env.VITE_API_KEY) {
      setAiAnalysis("Vui lòng cấu hình VITE_API_KEY trong biến môi trường để dùng tính năng này.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      const prompt = `Phân tích quỹ cầu lông: Quỹ ${totalFund.toLocaleString()} VNĐ, Nợ: ${JSON.stringify(memberBalances)}. Trả lời vui vẻ, ngắn gọn bằng tiếng Việt.`;
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
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
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
            memberBalances={memberBalances}
            aiAnalysis={aiAnalysis}
            isAnalyzing={isAnalyzing}
            onAddMember={addMember}
            onRemoveMember={removeMember}
            dbConfig={dbConfig}
            setDbConfig={setDbConfig}
          />
        )}
        {activeTab === 'sessions' && <TransactionList items={data.sessions} type="session" onEdit={editSession} onDelete={deleteSession} />}
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
              <h2 className="text-xl font-bold text-slate-800">{editingSession ? 'Sửa buổi chơi' : 'Ghi buổi chơi mới'}</h2>
              <button onClick={() => { setShowModal(null); setEditingSession(null); }} className="text-slate-400 p-2">✕</button>
            </div>
            <SessionForm initialData={editingSession || undefined} members={data.members} onSubmit={addSession} />
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
