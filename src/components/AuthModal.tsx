import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { safeParseJson } from '../lib/safeFetch';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    password: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear alerts as user types
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const url = isSignUp ? '/api/signup' : '/api/login';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data: any = await safeParseJson(res, { success: false, message: 'Server response error' });
      
      if (data?.success) {
        if (data?.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        setSuccessMsg(data?.message || (isSignUp ? 'সাইন আপ সফল হয়েছে!' : 'লগইন সফল হয়েছে!'));
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data?.message || 'অনুরোধটি ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (err) {
      setErrorMsg('নেটওয়ার্ক সমস্যা! অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 overflow-y-auto"
        id="auth-modal-overlay"
      >
        {/* Animated Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-100 flex flex-col"
          id="auth-modal-container"
        >
          {/* Top Elegant Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-600" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors duration-150"
            aria-label="Close modal"
            id="auth-close-button"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content Area */}
          <div className="p-8">
            {/* Header Text */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                {isSignUp ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'আপনার অ্যাকাউন্টে লগইন করুন'}
              </h3>
              <p className="text-sm text-slate-500">
                {isSignUp 
                  ? 'নিচের ফর্মটি পূরণ করে সহজ কয়েকটি পদক্ষেপে সাইন আপ সম্পন্ন করুন।' 
                  : 'চালিয়ে যেতে আপনার ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করুন।'}
              </p>
            </div>

            {/* Alert Messages */}
            {errorMsg && (
              <div className="mb-4 p-4.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-fadeIn">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-4.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-800 text-sm animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
              {isSignUp && (
                <div className="space-y-4">
                  {/* Name Fields Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">First Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Last Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="017XXXXXXXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150"
                      />
                    </div>
                  </div>

                  {/* Address Field */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Address (ঠিকানা)</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <textarea
                        name="address"
                        placeholder="আপনার ডেলিভারি ঠিকানা এখানে লিখুন..."
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        rows={2}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    placeholder="example@mail.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 mt-6 cursor-pointer"
                id="auth-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <span>{isSignUp ? 'সাইন আপ সম্পন্ন করুন' : 'লগইন করুন'}</span>
                )}
              </button>
            </form>

            {/* Toggle Sign Up / Login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none cursor-pointer"
                id="auth-toggle-btn"
              >
                {isSignUp ? 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন ইউজার? সাইন আপ করুন'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
