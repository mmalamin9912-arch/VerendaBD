import React, { useState } from 'react';
import { Sparkles, Send, MessageSquare, BarChart2, X, Circle } from 'lucide-react';
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
    <button onClick={() => setIsOpen(true)} aria-label="Open Zid AI Assistant" title="Open Zid AI Assistant" className="zid-ai-trigger fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl border-amber-300/50 bg-[#151923] text-amber-300 shadow-[0_12px_35px_rgba(0,0,0,.4)] transition hover:-translate-y-1 hover:border-amber-200 hover:text-amber-200">
      <span className="zid-ai-trigger__ring" aria-hidden="true" /><Sparkles className="relative z-10 h-6 w-6" />
    </button>
  );
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-[#181B26] border border-[#2E3548] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      <header className="relative flex items-center justify-between border-b border-slate-700/70 bg-[linear-gradient(135deg,#202838,#151b28)] px-5 py-4"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" /><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border-amber-300/40 bg-amber-300/10 text-amber-300"><Sparkles className="h-5 w-5" /></div><div><h3 className="text-sm font-extrabold tracking-wide text-white">Zid AI Assistant</h3><p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400"><Circle className="h-2 w-2 fill-cyan-400 text-cyan-400" /> Sales copilot online</p></div></div><button onClick={() => setIsOpen(false)} aria-label="Close Zid AI Assistant" title="Close assistant" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></header>
      <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,.07),transparent_42%)] p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${m.role === 'user' ? 'ml-auto rounded-br-md border-amber-300/30 bg-gradient-to-br from-amber-400 to-amber-500 font-medium text-slate-950' : 'mr-auto rounded-bl-md border-slate-700 bg-gradient-to-br from-[#202838] to-[#18202d] text-slate-100'}`}
          >
            {m.content}
          </div>
        ))}
        {isThinking && (
          <div className="mr-auto flex items-center gap-1 rounded-2xl rounded-bl-md border-slate-700 bg-[#202838] px-4 py-4" aria-label="Zid AI is typing">
            <span className="zid-ai-dot" /><span className="zid-ai-dot zid-ai-dot--2" /><span className="zid-ai-dot zid-ai-dot--3" />
          </div>
        )}
      </div>
      <footer className="border-t border-slate-700/70 bg-[#171d29] p-4">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => quickAsk('Summarize my sales performance and give me growth tips / আমার বিক্রয় পরিসংখ্যান ও গ্রোথ টিপস দিন')}
            className="rounded-lg border-slate-600 bg-slate-800/70 p-2 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-300"
            title="Growth insights"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => quickAsk('My plan upgrade is still pending. Why? / আমার প্ল্যান আপগ্রেড এখনো পেন্ডিং কেন?')}
            className="rounded-lg border-slate-600 bg-slate-800/70 p-2 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-300"
            title="Plan / subscription support"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-xl border-slate-600 bg-[#0f141e] p-1.5 focus-within:border-amber-300/70">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void sendQuery(input); }}
            className="flex-1 bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-2 text-sm text-white outline-none"
            placeholder="Ask Zid AI anything..."
            aria-label="Ask Zid AI"
          />
          <button
            onClick={() => void sendQuery(input)}
            disabled={isThinking || !input.trim()}
            aria-label="Send message"
            title="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </section>
  );
};
