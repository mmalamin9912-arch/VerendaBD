import React, { useState } from 'react';
import { Cpu, Send, MessageSquare, BarChart2, X } from 'lucide-react';
import { generateAiText, ZID_AI_SYSTEM_INSTRUCTION } from '../lib/aiService';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

const WELCOME_MESSAGE =
  'Hello! I am Zid AI — your Sales Copilot & Platform Support Specialist. Ask me about products, orders, payments, plans/subscriptions, or how to grow your sales.\n\n' +
  'আমি বাংলা ও ইংরেজি — দুই ভাষাতেই উত্তর দিতে পারি। যে ভাষায় লিখবেন, সেই ভাষায়ই উত্তর পাবেন।';

/** Detects Bengali script or Banglish (romanized Bengali) input for offline fallbacks. */
function looksBengali(text: string): boolean {
  if (/[\u0980-\u09FF]/.test(text)) return true;
  return /\b(ami|amar|kivabe|kemne|kothay|korte|pari|parbo|korbo|korle|hobe|koto|koyta|keno|jonno|lagbe|chai|dorkar|bikri|dokan|ache|chilo|korchen|hocche|jabe|kora|hvbe)\b/i.test(text);
}

/** Offline fallback answers (used when the AI service is unreachable). */
function getFallbackResponse(query: string): string {
  const q = query.toLowerCase();
  const isBangla = looksBengali(query);

  // Subscription / plan / billing questions — Admin-approval policy
  if (/plan|subscription|upgrade|billing|package|approve|verify/.test(q) || /প্ল্যান|সাবস্ক্রিপশন|আপগ্রেড|বিলিং|পেন্ডিং/.test(query)) {
    return isBangla
      ? "আপনি যখন প্ল্যান আপগ্রেড বা কেনাকাটা করেন, তা Admin পেমেন্ট যাচাই না করা পর্যন্ত 'Pending' স্ট্যাটাসে থাকে। পেমেন্ট যাচাই হওয়ার পর আপনার প্ল্যান স্বয়ংক্রিয়ভাবে অ্যাক্টিভ হয়ে যাবে।\n\nযদি পেমেন্টের অনেক সময় পরেও প্ল্যান অ্যাক্টিভ না হয়, অনুগ্রহ করে প্ল্যাটফর্ম সাপোর্টে যোগাযোগ করুন।"
      : "When you upgrade or purchase a plan, it stays in 'Pending' status until the Admin verifies the payment. Once verified, your plan will be activated automatically.\n\nIf your plan remains inactive long after payment, please contact platform support.";
  }
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
  // Sales / marketing / growth questions
  if (/sale|grow|market|revenue|analytic|tips|advertis|boost|promot|seo/.test(q) || /বিক্রি|মার্কেটিং|বৃদ্ধি|টিপস|গ্রোথ/.test(query)) return isBangla
    ? "বিক্রয় বাড়াতে: ১) ফ্ল্যাশ সেল ও কাউন্টডাউন টাইমার ব্যবহার করুন, ২) সোশ্যাল মিডিয়ায় নিয়মিত পোস্ট দিন, ৩) বান্ডেল অফার ও ফ্রি শিপিং চালু করুন, ৪) পুরনো গ্রাহকদের WhatsApp-এ নতুন অফার জানান।"
    : "To grow sales: 1) Run flash sales with countdown timers, 2) Post consistently on social media, 3) Offer bundles and free shipping, 4) Re-engage past customers on WhatsApp with new offers.";
  return isBangla
    ? "আমি পণ্য, অর্ডার, পেমেন্ট, প্ল্যান/সাবস্ক্রিপশন এবং বিক্রয় বৃদ্ধি — সব বিষয়ে সাহায্য করতে পারি। আপনার কী জানতে চান?"
    : "I can help with products, orders, payments, plans/subscriptions, and growing your sales. What would you like to know?";
}


export const ZidAiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const sendQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isThinking) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    let answer = '';
    try {
      // Build the conversation so the AI keeps language + topic context.
      const conversation = messages
        .concat(userMsg)
        .map(m => `${m.role === 'user' ? 'Merchant' : 'Zid AI'}: ${m.content}`)
        .join('\n');
      const prompt = `${conversation}\n\nRespond to the Merchant's latest message. Remember: always reply in the exact same language the merchant used (Bengali/Banglish → Bengali, English → English), and never switch languages mid-conversation.`;

      const result = await generateAiText(prompt, ZID_AI_SYSTEM_INSTRUCTION);
      answer = result.ok && result.text ? result.text : getFallbackResponse(trimmed);
    } catch {
      answer = getFallbackResponse(trimmed);
    }

    setMessages(prev => [...prev, { role: 'ai', content: answer }]);
    setIsThinking(false);
  };

  const quickAsk = (query: string) => {
    void sendQuery(query);
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
          <div
            key={i}
            className={`p-3 rounded-xl text-sm whitespace-pre-wrap max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-[#202533] text-slate-200 mr-auto'}`}
          >
            {m.content}
          </div>
        ))}
        {isThinking && (
          <div className="p-3 rounded-xl text-sm bg-[#202533] text-slate-400 mr-auto max-w-[85%] animate-pulse">
            Zid AI is thinking… / ভাবছি…
          </div>
        )}
      </div>
      <div className="p-4 border-t border-[#2E3548] bg-[#202533]">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => quickAsk('Summarize my sales performance and give me growth tips / আমার বিক্রয় পরিসংখ্যান ও গ্রোথ টিপস দিন')}
            className="bg-[#2E3548] text-white p-2 rounded-lg cursor-pointer"
            title="Growth insights"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => quickAsk('My plan upgrade is still pending. Why? / আমার প্ল্যান আপগ্রেড এখনো পেন্ডিং কেন?')}
            className="bg-[#2E3548] text-white p-2 rounded-lg cursor-pointer"
            title="Plan / subscription support"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void sendQuery(input); }}
            className="flex-1 bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-2 text-sm text-white outline-none"
            placeholder="Ask Zid AI... / জিজ্ঞাসা করুন..."
          />
          <button
            onClick={() => void sendQuery(input)}
            disabled={isThinking}
            className="bg-indigo-600 p-2 rounded-xl text-white disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
