import React from 'react';
import { BarChart3, PieChart as PieIcon, MapPin } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

import { Order } from '../../types';

interface AnalyticsViewProps {
  orders: Order[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ orders }) => {
  // Dynamic calculation for Regional Sales
  const regionalSalesMap = orders.reduce((acc, order) => {
    const region = order.customerCity || 'Unknown';
    acc[region] = (acc[region] || 0) + order.totalBDT;
    return acc;
  }, {} as Record<string, number>);

  const regionalSalesData = Object.entries(regionalSalesMap)
    .map(([region, salesBDT]) => ({ region, salesBDT: Number(salesBDT) }))
    .sort((a, b) => Number(b.salesBDT) - Number(a.salesBDT))
    .slice(0, 5); // Top 5 regions

  // Dynamic calculation for Payment Method Distribution
  const paymentMethodMap = orders.reduce((acc, order) => {
    const method = order.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalOrders = orders.length;
  const paymentMethodColors: Record<string, string> = {
    'bKash': '#EC4899',
    'Nagad': '#F97316',
    'Rocket': '#8B5CF6',
    'Bank Transfer': '#3B82F6',
    'COD': '#00D68F',
    'Other': '#64748B'
  };

  const paymentMethodData = Object.entries(paymentMethodMap).map(([name, count]) => ({
    name,
    value: totalOrders > 0 ? Math.round((Number(count) / totalOrders) * 100) : 0,
    color: paymentMethodColors[name] || '#64748B'
  }));

  const hasData = orders.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-[#202533] border border-[#2E3548] p-5 rounded-2xl flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics & Performance Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Sales breakdown by payment method and Bangladeshi districts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Sales Chart */}
        <div className="bg-[#202533] border border-[#2E3548] p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00D68F]" />
            <span>Sales by District (BDT ৳)</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalSalesData}>
                  <XAxis dataKey="region" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#181B26', borderColor: '#2E3548', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: any) => [`৳${val.toLocaleString()} BDT`, 'Sales']}
                  />
                  <Bar dataKey="salesBDT" fill="#00D68F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <MapPin className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest">No regional data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-[#202533] border border-[#2E3548] p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-400" />
            <span>Payment Gateway Distribution (%)</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#181B26', borderColor: '#2E3548', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: any) => [`${val}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <PieIcon className="w-6 h-6 opacity-20" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest">No payment data available</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {hasData ? paymentMethodData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}: <strong className="text-white">{item.value}%</strong></span>
              </div>
            )) : (
              <div className="col-span-2 text-center text-slate-600 italic">Wait for your first order...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
