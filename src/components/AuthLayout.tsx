import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Truck, CreditCard, FileText } from 'lucide-react';

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      title: "Connect with AI tools",
      description: "AI-powered store assistant for auto inventory & sales updates.",
      icon: Bot,
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "Automated Courier Shipping",
      description: "One-click order dispatch with Steadfast, Pathao & Courier APIs.",
      icon: Truck,
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "Express Checkout & BKash",
      description: "Fast 1-click checkout for maximum conversion rates.",
      icon: CreditCard,
      imageUrl: "https://images.unsplash.com/photo-1556742049-0a67f572d312?auto=format&fit=crop&w=800&q=80"
    },
    {
      title: "NBR Mushak 6.3 Invoicing",
      description: "Compliant e-invoicing and VAT tax management made easy.",
      icon: FileText,
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
    }
  ];


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen flex bg-[#141722] text-slate-100 font-sans">
      {/* Left Side: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-[#1D212E] shadow-2xl">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

      {/* Right Side: Carousel Banner */}
      <div className="flex flex-1 items-center justify-center p-12 bg-slate-950">
        <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col"
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${slides[currentSlide].imageUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/30" />
              </div>
              <div className="relative p-10 flex flex-col justify-end h-full">
                <div className="mb-4 bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  {(() => {
                    const Icon = slides[currentSlide].icon;
                    return <Icon className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <h2 className="text-3xl font-black text-white mb-3">{slides[currentSlide].title}</h2>
                <p className="text-slate-200 text-lg leading-relaxed">{slides[currentSlide].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Pagination Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${currentSlide === index ? 'bg-white w-8' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
