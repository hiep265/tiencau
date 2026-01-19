
import React, { useState } from 'react';
import { AppState } from '../types';

interface Props {
  data: AppState;
  memberBalances: Record<string, number>;
  aiAnalysis: string;
  isAnalyzing: boolean;
  onAddMember: (name: string) => void;
  onRemoveMember: (name: string) => void;
  dbConfig: { url: string; key: string; groupId: string };
  setDbConfig: (config: any) => void;
}

const SummaryView: React.FC<Props> = ({
  data,
  memberBalances,
  aiAnalysis,
  isAnalyzing,
  onAddMember,
  onRemoveMember,
  dbConfig,
  setDbConfig
}) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [showDbSettings, setShowDbSettings] = useState(false);
  const latestSessions = data.sessions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* AI Assistant */}
      <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🤖</span>
          <h3 className="font-bold text-indigo-900">Trợ lý Cầu Lông</h3>
        </div>
        {isAnalyzing ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
            <span className="text-sm text-indigo-600 font-medium italic">Đang phân tích...</span>
          </div>
        ) : aiAnalysis ? (
          <div className="text-slate-700 text-sm italic leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
        ) : (
          <p className="text-xs text-slate-500">Bấm ✨ để xem phân tích tài chính của nhóm.</p>
        )}
      </div>

      {/* Cloud Settings */}
      {/* <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <button 
          onClick={() => setShowDbSettings(!showDbSettings)}
          className="w-full flex justify-between items-center font-bold text-slate-800"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">☁️</span> Đồng bộ Đám mây
          </div>
          <span className="text-slate-400 text-xs">{showDbSettings ? 'Đóng' : 'Cấu hình'}</span>
        </button>
        
        {showDbSettings && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top duration-300">
            <div className="p-3 bg-blue-50 rounded-xl mb-2">
               <p className="text-[10px] text-blue-700 leading-tight font-medium">
                 💡 <b>Mẹo:</b> Lấy <b>URL</b> và <b>Anon Key</b> trong mục <i>Settings {'>'} API</i> trên Supabase.
                 Dùng URL có dạng <code>https://...</code> chứ không dùng link <code>postgres://...</code>
               </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Tên Nhóm (Group ID)</label>
              <input 
                type="text" 
                value={dbConfig.groupId}
                onChange={e => setDbConfig({...dbConfig, groupId: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ví dụ: nhom-cau-long-quan-7"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Supabase URL (API URL)</label>
              <input 
                type="text" 
                value={dbConfig.url}
                onChange={e => setDbConfig({...dbConfig, url: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://your-id.supabase.co"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Anon Key (Public Key)</label>
              <input 
                type="password" 
                value={dbConfig.key}
                onChange={e => setDbConfig({...dbConfig, key: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="eyJhb..."
              />
            </div>
          </div>
        )}
      </div> */}

      {/* Members & Balances */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-lg">👥</span> Thành viên & Số dư cá nhân
        </h3>
        <div className="space-y-2 mb-6">
          {(Object.entries(memberBalances) as [string, number][]).map(([name, amount]) => (
            <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <button onClick={() => onRemoveMember(name)} className="w-5 h-5 rounded-full bg-slate-50 text-slate-300 hover:text-red-400 flex items-center justify-center text-[10px]">✕</button>
                <span className="text-sm font-medium text-slate-600">{name}</span>
              </div>
              <span className={`text-sm font-bold ${amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {amount >= 0 ? '+' : ''}{Math.round(amount).toLocaleString()} VNĐ
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tên mới..."
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none"
          />
          <button
            onClick={() => { if (newMemberName) onAddMember(newMemberName); setNewMemberName(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >+ Thêm</button>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="font-bold text-slate-800 mb-4 ml-1">Hoạt động gần đây</h3>
        <div className="space-y-3">
          {latestSessions.length > 0 ? latestSessions.map(session => (
            <div key={session.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-800">{new Date(session.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</p>
                <p className="text-[10px] text-slate-400 italic">Chi: {Object.values(session.payers).filter(v => v !== 'Quỹ').join(', ') || 'Từ quỹ'}</p>
              </div>
              <p className="text-sm font-black text-indigo-600">
                - {(session.costs.court + session.costs.water + session.costs.shuttle).toLocaleString()} VNĐ
              </p>
            </div>
          )) : (
            <p className="text-center py-4 text-slate-400 text-xs italic">Chưa có dữ liệu buổi chơi.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryView;
