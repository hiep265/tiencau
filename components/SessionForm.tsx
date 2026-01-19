
import React, { useState } from 'react';
import { BadmintonSession, Payer, SessionPayers } from '../types';

interface Props {
  initialData?: BadmintonSession;
  members: string[];
  onSubmit: (session: BadmintonSession) => void;
}

const SessionForm: React.FC<Props> = ({ initialData, members, onSubmit }) => {
  const [court, setCourt] = useState(initialData?.costs.court || 0);
  const [water, setWater] = useState(initialData?.costs.water || 0);
  const [shuttle, setShuttle] = useState(initialData?.costs.shuttle || 0);
  const [payers, setPayers] = useState<SessionPayers>(initialData?.payers || {
    court: 'Quỹ',
    water: 'Quỹ',
    shuttle: 'Quỹ'
  });
  const [isPrepaid, setIsPrepaid] = useState(initialData?.isPrepaid || { court: false, water: false, shuttle: false });
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialData?.id || crypto.randomUUID(),
      date,
      payers,
      costs: { court, water, shuttle },
      isPrepaid
    });
  };

  const PayerSelect = ({ value, onChange }: { value: Payer, onChange: (val: Payer) => void }) => (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-100 border-none rounded-lg text-[11px] font-bold text-slate-700 p-1 focus:ring-1 focus:ring-indigo-500"
    >
      <option value="Quỹ">Quỹ</option>
      {members.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Ngày chơi</label>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div className="space-y-5">
        <label className="block text-sm font-semibold text-slate-700">Chi tiết chi phí</label>
        
        {/* Court Fee */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Tiền sân</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPrepaid.court}
                  onChange={e => setIsPrepaid(prev => ({ ...prev, court: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-600"
                /> Trả trước
              </label>
              <PayerSelect value={payers.court} onChange={(v) => setPayers(p => ({...p, court: v}))} />
            </div>
          </div>
          <input 
            type="number" 
            placeholder="0"
            value={court || ''} 
            onChange={e => setCourt(Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Water Fee */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Tiền nước</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPrepaid.water}
                  onChange={e => setIsPrepaid(prev => ({ ...prev, water: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-600"
                /> Trả trước
              </label>
              <PayerSelect value={payers.water} onChange={(v) => setPayers(p => ({...p, water: v}))} />
            </div>
          </div>
          <input 
            type="number" 
            placeholder="0"
            value={water || ''} 
            onChange={e => setWater(Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Shuttle Fee */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Tiền cầu</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isPrepaid.shuttle}
                  onChange={e => setIsPrepaid(prev => ({ ...prev, shuttle: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-600"
                /> Trả trước
              </label>
              <PayerSelect value={payers.shuttle} onChange={(v) => setPayers(p => ({...p, shuttle: v}))} />
            </div>
          </div>
          <input 
            type="number" 
            placeholder="0"
            value={shuttle || ''} 
            onChange={e => setShuttle(Number(e.target.value))}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] mt-4"
      >
        {initialData ? 'Cập nhật buổi chơi' : 'Lưu buổi chơi'}
      </button>
    </form>
  );
};

export default SessionForm;
