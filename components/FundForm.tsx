
import React, { useState } from 'react';
import { FundTransaction, Payer } from '../types';

interface Props {
  type: 'CONTRIBUTION' | 'PREPAID_PURCHASE';
  members: string[];
  onSubmit: (tx: FundTransaction) => void;
}

const FundForm: React.FC<Props> = ({ type, members, onSubmit }) => {
  const [amount, setAmount] = useState(0);
  const [payer, setPayer] = useState<Payer>('Quỹ');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'court' | 'water' | 'shuttle' | 'general'>('general');
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: crypto.randomUUID(),
      date,
      amount,
      payer,
      type,
      description: description || (type === 'CONTRIBUTION' ? 'Đóng quỹ định kỳ' : `Mua ${category} trả trước`),
      category: type === 'PREPAID_PURCHASE' ? category : 'general'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Số tiền (VNĐ)</label>
        <input 
          type="number" 
          placeholder="Ví dụ: 500000"
          value={amount || ''} 
          onChange={e => setAmount(Number(e.target.value))}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-2xl font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Người chi trả</label>
        <select 
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
        >
          <option value="Quỹ">Quỹ (Chi từ tiền quỹ chung)</option>
          {members.map(m => (
            <option key={m} value={m}>{m} (Chi hộ nhóm)</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-1 italic">* Nếu chọn thành viên, quỹ sẽ tính là khoản nợ cho thành viên đó.</p>
      </div>

      {type === 'PREPAID_PURCHASE' && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Hạng mục mua</label>
          <div className="grid grid-cols-3 gap-2">
            {(['court', 'water', 'shuttle'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-2 text-xs rounded-xl border-2 transition-all capitalize ${
                  category === cat 
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold' 
                  : 'border-slate-100 text-slate-500'
                }`}
              >
                {cat === 'court' ? 'Sân' : cat === 'water' ? 'Nước' : 'Cầu'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Ghi chú (Tùy chọn)</label>
        <textarea 
          placeholder="Ghi chú thêm..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          rows={3}
        />
      </div>

      <button 
        type="submit"
        className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4 ${
          type === 'CONTRIBUTION' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {type === 'CONTRIBUTION' ? 'Xác nhận đóng quỹ' : 'Xác nhận mua trả trước'}
      </button>
    </form>
  );
};

export default FundForm;
