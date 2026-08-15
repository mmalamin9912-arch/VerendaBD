import React from 'react';
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, UserCheck } from 'lucide-react';

export const StockChangesView: React.FC = () => {
  const stockLogs = [];

  return (
    <div className="space-y-6">
      <div className="bg-[#202533] border border-[#2E3548] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#00D68F]" />
            <span>Inventory Stock Changes & Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete historical audit trail of all manual adjustments, sales deductions, and regional warehouse stock transfers.
          </p>
        </div>
      </div>

      <div className="bg-[#202533] border border-[#2E3548] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181B26] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#2E3548] font-bold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Product & SKU</th>
                <th className="p-3.5">Warehouse Location</th>
                <th className="p-3.5">Adjustment</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Adjusted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E3548]">
              {stockLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#252B3B]">
                  <td className="p-3.5 text-slate-400 font-medium">{log.timestamp}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-white">{log.productName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{log.sku}</div>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-300">{log.warehouse}</td>
                  <td className="p-3.5 font-extrabold">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                      log.isIncrease ? 'bg-[#00D68F]/20 text-[#00D68F]' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {log.isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{log.change}</span>
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-300">{log.reason}</td>
                  <td className="p-3.5 text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#00D68F]" />
                    <span>{log.updatedBy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
