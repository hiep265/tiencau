
import React from 'react';
import { BadmintonSession, FundTransaction } from '../types';

interface Props {
  items: (BadmintonSession | FundTransaction)[];
  type: 'session' | 'fund';
  onEdit?: (session: BadmintonSession) => void;
  onDelete?: (id: string) => void;
}

const TransactionList: React.FC<Props> = ({ items, type, onEdit, onDelete }) => {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-800 mb-4 ml-1">
        {type === 'session' ? 'Lịch sử chơi cầu' : 'Lịch sử giao dịch quỹ'}
      </h3>
      {items.length === 0 ? (
        <div className="text-center py-20 text-slate-300 font-medium">
          Trống trơn...
        </div>
      ) : (
        items.map((item) => {
          if (type === 'session') {
            const s = item as BadmintonSession;
            const total = s.costs.court + s.costs.water + s.costs.shuttle;
            return (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                    {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-700">-{total.toLocaleString()} VNĐ</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit?.(s)}
                        className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-md transition-colors"
                        title="Sửa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete?.(s.id)}
                        className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Xóa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.34 12m-4.78 0l-.34-12m11.318-6.318L21 4.5M3 4.5l1.062-1.062M19.07 19.07l-2.122-2.122M4.93 4.93 2.808 2.808M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-[10px] text-slate-500 font-medium border-t border-slate-50 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      Sân: <b className={s.isPrepaid.court ? 'text-blue-500' : 'text-slate-800'}>{s.costs.court.toLocaleString()} {s.isPrepaid.court && '(P)'}</b>
                    </span>
                    <span className="text-slate-400 italic">Người trả: {s.payers?.court || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      Nước: <b className={s.isPrepaid.water ? 'text-blue-500' : 'text-slate-800'}>{s.costs.water.toLocaleString()} {s.isPrepaid.water && '(P)'}</b>
                    </span>
                    <span className="text-slate-400 italic">Người trả: {s.payers?.water || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      Cầu: <b className={s.isPrepaid.shuttle ? 'text-blue-500' : 'text-slate-800'}>{s.costs.shuttle.toLocaleString()} {s.isPrepaid.shuttle && '(P)'}</b>
                    </span>
                    <span className="text-slate-400 italic">Người trả: {s.payers?.shuttle || 'N/A'}</span>
                  </div>
                  {/* Participants */}
                  <div className="flex items-center gap-1 pt-1 border-t border-slate-50 mt-1">
                    <span className="text-slate-400">👥 Tham gia:</span>
                    <span className="text-indigo-600 font-semibold">
                      {s.participants?.join(', ') || 'Tất cả'}
                    </span>
                  </div>
                </div>
              </div>
            );
          } else {
            const f = item as FundTransaction;
            const isPlus = f.type === 'CONTRIBUTION';
            return (
              <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner ${isPlus ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {isPlus ? '💰' : '💸'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{f.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(f.date).toLocaleDateString('vi-VN')} • Chi bởi: {f.payer || 'Quỹ'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-sm font-black ${isPlus ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isPlus ? '+' : '-'}{f.amount.toLocaleString()}
                  </div>
                  <button
                    onClick={() => onDelete?.(f.id)}
                    className="p-1.5 bg-slate-50 text-slate-300 hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100 active:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 12m-4.78 0-.34-12m11.318-6.318L21 4.5M3 4.5l1.062-1.062M19.07 19.07l-2.122-2.122M4.93 4.93 2.808 2.808M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          }
        })
      )}
    </div>
  );
};

export default TransactionList;
