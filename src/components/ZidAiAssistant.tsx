import React, { useState } from 'react';
import { Cpu, Send, MessageSquare, BarChart2, Mail, X } from 'lucide-react';

export const ZidAiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    {role: 'ai', content: 'Hello! I am Zid AI, your Store Manager Copilot. How can I help you today?'}
  ]);
  const [input, setInput] = useState('');

  const getMockResponse = (query: string, type: 'support' | 'analytics') => {
    const q = query.toLowerCase();
    const isBangla = /[\u0980-\u09FF]/.test(query) || /\b(ki|kivabe|kemne|kothay|korte|pari|korbo|domain|product|order|bkash|taka|koto|bikri)\b/i.test(query);

    if (type === 'support') {
      if (q.includes('domain') || q.includes('ডোমেইন')) return isBangla 
        ? "কাস্টম ডোমেইন যুক্ত করতে Settings -> Domains এ যান এবং আপনার ডোমেইনের নাম লিখুন। নির্দেশিকা অনুযায়ী আপনার DNS রেকর্ড আপডেট করুন।"
        : "To connect a custom domain, go to Settings -> Domains and enter your domain name. Ensure your DNS records are updated as instructed.";
      if (q.includes('product') || q.includes('upload') || q.includes('পণ্য') || q.includes('আপলোড')) return isBangla
        ? "পণ্য আপলোড করতে 'Products' ট্যাবে যান এবং 'Add Product' এ ক্লিক করুন। পণ্যের নাম, দাম এবং ছবি দিয়ে 'Save' করুন।"
        : "To upload products, navigate to the 'Products' tab and click 'Add Product'. Fill in the details like title, price, and images, then click 'Save'.";
      if (q.includes('order') || q.includes('অর্ডার')) return isBangla
        ? "অর্ডার পরিচালনা করতে 'Orders' ট্যাবটি দেখুন। এখানে আপনি গ্রাহকের অর্ডার দেখতে এবং স্ট্যাটাস আপডেট করতে পারবেন।"
        : "To manage orders, check the 'Orders' tab. You can view, process, and update the status of your customer orders here.";
      if (q.includes('payment') || q.includes('bkash') || q.includes('পেমেন্ট') || q.includes('বিকাশ')) return isBangla
        ? "পেমেন্ট গেটওয়ের জন্য Settings -> Payments এ যান। সেখান থেকে আপনি বিকাশ, কার্ড বা ক্যাশ অন ডেলিভারি (COD) চালু করতে পারবেন।"
        : "For payment gateways, visit Settings -> Payments. You can enable various methods like bKash, card, or COD there.";
      return isBangla
        ? "আমি ডোমেইন সেটআপ, পণ্য পরিচালনা, অর্ডার এবং পেমেন্ট সংক্রান্ত সাহায্য করতে পারি। আপনার নির্দিষ্ট কী সাহায্য প্রয়োজন?"
        : "I can help with domain setup, product management, orders, and payments. What specifically do you need help with?";
    } else {
      return isBangla
        ? "আপনার অ্যানালিটিক্স দেখতে, নিশ্চিত করুন যে আপনার অ্যাক্টিভ সেল আছে। ডেটা উপলব্ধ হলে আমি মোট বিক্রি, শীর্ষ পণ্য এবং স্টকের অবস্থা সারাংশ করতে পারব।"
        : "To see your analytics, ensure you have active sales. I can summarize total sales, top-selling products, and stock status once data is available.";
    }
  };

  const sendQuery = async (query: string, type: 'support' | 'analytics') => {
    setMessages(prev => [...prev, {role: 'user', content: query}]);
    
    let answer = '';
    try {
      const endpoint = type === 'support' ? '/api/ai/copilot-support' : '/api/ai/copilot-analytics';
      const body = type === 'support' ? { query } : { query, storeData: { sales: '1000 BDT', products: 50 } };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
          const data = await res.json();
          answer = data.answer;
      } else {
          answer = getMockResponse(query, type);
      }
    } catch {
      answer = getMockResponse(query, type);
    }
    setMessages(prev => [...prev, {role: 'ai', content: answer}]);
    setInput('');
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-indigo-600 p-4 rounded-full shadow-2xl text-white cursor-pointer z-50">
      <Cpu className="w-6 h-6" />
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#181B26] border border-[#2E3548] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#2E3548] flex justify-between items-center bg-[#202533]">
        <h3 className="font-bold text-white flex items-center gap-2"><Cpu className="w-5 h-5 text-indigo-400" /> Zid AI Assistant</h3>
        <button onClick={() => setIsOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-[#202533] text-slate-200 self-start'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-[#2E3548] bg-[#202533]">
        <div className="flex gap-2 mb-3">
          <button onClick={() => sendQuery('What is my daily revenue?', 'analytics')} className="bg-[#2E3548] text-white p-2 rounded-lg"><BarChart2 className="w-4 h-4" /></button>
          <button onClick={() => sendQuery('How to upload a product?', 'support')} className="bg-[#2E3548] text-white p-2 rounded-lg"><MessageSquare className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-2 text-sm text-white outline-none" placeholder="Ask Zid AI..." />
          <button onClick={() => sendQuery(input, 'support')} className="bg-indigo-600 p-2 rounded-xl text-white"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};
