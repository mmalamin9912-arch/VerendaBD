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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0D111A] text-slate-100 font-sans">
      {/* Left Side: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 bg-[#121824] shadow-2xl border-r border-[#1E2638] overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {children}
        </div>
      </div>

      {/* Right Side: Carousel Banner */}
      <div className="flex flex-1 items-center justify-center p-8 sm:p-12 lg:p-16 bg-[#0B0F17]">
        <div className="relative w-full max-w-lg aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                style={{ backgroundImage: `url(${slides[currentSlide].imageUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/75 to-transparent" />
              </div>
              <div className="relative p-8 sm:p-10 flex flex-col justify-end h-full">
                <div className="mb-4 bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg">
                  {(() => {
                    const Icon = slides[currentSlide].icon;
                    return <Icon className="w-7 h-7 text-[#D4AF37]" />;
                  })()}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2.5 tracking-tight">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Pagination Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === index ? 'bg-[#D4AF37] w-8' : 'bg-white/40 hover:bg-white/70 w-2.5'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
