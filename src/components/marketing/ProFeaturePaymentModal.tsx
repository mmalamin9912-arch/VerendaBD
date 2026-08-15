import React, { useState } from 'react';
import { X, Check, CreditCard, Building2, Copy, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';
import { MerchantProfile, AdminPaymentGatewayConfig } from '../../types';

interface ProFeaturePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: MerchantProfile;
  adminPaymentConfig: AdminPaymentGatewayConfig;
  onConfirmPayment: (method: string, txId: string) => void;
}

export const ProFeaturePaymentModal: React.FC<ProFeaturePaymentModalProps> = ({
  isOpen,
  onClose,
  merchant,
  adminPaymentConfig,
  onConfirmPayment,
}) => {
  const [step, setStep] = useState<'payment' | 'success'>('payment');
  const [adminPaymentMethod, setAdminPaymentMethod] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Auto-select first active payment method
  React.useEffect(() => {
    if (isOpen && !adminPaymentMethod) {
      if (adminPaymentConfig.bkashActive) setAdminPaymentMethod('bkash_admin');
      else if (adminPaymentConfig.nagadActive) setAdminPaymentMethod('nagad_admin');
      else if (adminPaymentConfig.rocketActive) setAdminPaymentMethod('rocket_admin');
      else if (adminPaymentConfig.bankActive) setAdminPaymentMethod('bank_admin');
    }
  }, [isOpen, adminPaymentConfig]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
      onConfirmPayment(adminPaymentMethod, transactionId);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#1D212E] border border-[#2E3548] rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-5 bg-[#202535] border-b border-[#2E3548] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upgrade Marketing to Pro</h2>
              <p className="text-xs text-slate-400">Unlock TikTok Pixel, Advanced Analytics & Premium Integrations</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-[#282D3F] hover:bg-[#32394E] rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'payment' ? (
            <div className="space-y-6">
              {/* Feature Benefit */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
                <div className="text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-300">
                  You are requesting a <span className="text-white font-bold">Marketing Pro Upgrade</span>. 
                  Once your payment is verified by our admin, TikTok Pixel and other Pro apps will be unlocked permanently for this store.
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {adminPaymentConfig.bkashActive && (
                    <button
                      type="button"
                      onClick={() => setAdminPaymentMethod('bkash_admin')}
                      className={`p-3 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center gap-2 transition ${
                        adminPaymentMethod === 'bkash_admin' ? 'border-pink-500 bg-pink-500/10 text-pink-400' : 'border-[#2E3548] bg-[#202533] text-slate-400'
                      }`}
                    >
                      <span className="px-2 py-0.5 rounded bg-pink-500 text-white font-black text-[8px]">bKash</span>
                      <span>bKash</span>
                    </button>
                  )}
                  {adminPaymentConfig.nagadActive && (
                    <button
                      type="button"
                      onClick={() => setAdminPaymentMethod('nagad_admin')}
                      className={`p-3 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center gap-2 transition ${
                        adminPaymentMethod === 'nagad_admin' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[#2E3548] bg-[#202533] text-slate-400'
                      }`}
                    >
                      <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-black text-[8px]">Nagad</span>
                      <span>Nagad</span>
                    </button>
                  )}
                  {adminPaymentConfig.bankActive && (
                    <button
                      type="button"
                      onClick={() => setAdminPaymentMethod('bank_admin')}
                      className={`p-3 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center gap-2 transition ${
                        adminPaymentMethod === 'bank_admin' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-[#2E3548] bg-[#202533] text-slate-400'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                      <span>Bank</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Details */}
              <div className="bg-[#181B26] border border-[#2E3548] rounded-xl p-5">
                {adminPaymentMethod === 'bkash_admin' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Zid Admin bKash ({adminPaymentConfig.bkashType})</span>
                      <div className="text-lg font-mono font-bold text-pink-400">{adminPaymentConfig.bkashNumber}</div>
                    </div>
                    <button onClick={() => handleCopy(adminPaymentConfig.bkashNumber, 'bkash')} className="bg-[#282E3F] text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 border border-[#3A435E] cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                      {copiedField === 'bkash' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {adminPaymentMethod === 'nagad_admin' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Zid Admin Nagad ({adminPaymentConfig.nagadType})</span>
                      <div className="text-lg font-mono font-bold text-orange-400">{adminPaymentConfig.nagadNumber}</div>
                    </div>
                    <button onClick={() => handleCopy(adminPaymentConfig.nagadNumber, 'nagad')} className="bg-[#282E3F] text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 border border-[#3A435E] cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                      {copiedField === 'nagad' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {adminPaymentMethod === 'bank_admin' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Bank</span>
                      <div className="text-xs font-bold text-white">{adminPaymentConfig.bankName}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Account No</span>
                      <div className="text-xs font-mono font-bold text-blue-400">{adminPaymentConfig.accountNumber}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">Enter Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g., BK9X882910"
                    className="w-full bg-[#181B26] border border-[#2E3548] rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-amber-500 focus:outline-none transition"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#2E3548]">
                  <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-white cursor-pointer underline">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !transactionId.trim()}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-8 py-3 rounded-xl text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Upgrade Request'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Upgrade Request Sent!</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                  Your payment request for <span className="text-amber-500 font-bold">Marketing Pro Features</span> has been submitted with TrxID: <span className="text-white font-mono">{transactionId}</span>.
                </p>
                <p className="text-xs text-slate-500 mt-4">Admin will verify and unlock your access shortly.</p>
              </div>
              <button
                onClick={onClose}
                className="bg-emerald-500 text-slate-950 font-bold px-8 py-3 rounded-xl text-sm hover:bg-emerald-400 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
