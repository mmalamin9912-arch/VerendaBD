import React, { useState, useEffect } from 'react';
import { MerchantProfile, Product, BankAccount, MobileBankingConfig, Order, OrderItem, ThemeConfig } from '../types';
import { ShoppingBag, X, Check, CreditCard, Building2, Smartphone, ShieldCheck, Search, Globe, Phone, MapPin, ArrowRight, ArrowLeft, ExternalLink, Clock, Menu, User, Lock, Sparkles, PackageCheck, LogOut } from 'lucide-react';
import { readZidStoreData, subscribeToZidStoreData, writeZidStoreData, type ZidStoreData } from '../lib/storeData';

interface TenantStorefrontViewProps {
  storeSlug: string;
  merchant: MerchantProfile;
  products: Product[];
  bankAccounts: BankAccount[];
  mobileBanking: MobileBankingConfig[];
  themes: ThemeConfig[];
  orders: Order[];
  onPlaceOrder: (order: Order) => void;
}

export const TenantStorefrontView: React.FC<TenantStorefrontViewProps> = ({
  storeSlug,
  merchant,
  products,
  bankAccounts,
  mobileBanking,
  themes,
  orders,
  onPlaceOrder,
}) => {
  // The storefront may be mounted in another route/tab from the editor. Subscribe
  // directly to the shared store so products and published theme changes appear
  // immediately without remounting or refreshing the page.
  const [liveStoreData, setLiveStoreData] = useState<ZidStoreData>(() => readZidStoreData(storeSlug));
  useEffect(() => subscribeToZidStoreData(setLiveStoreData, storeSlug), [storeSlug]);
  useEffect(() => {
    let active = true;
    const loadStorefront = async () => {
      try {
        const response = await fetch(`/api/storefront?store_slug=${encodeURIComponent(storeSlug)}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
        const payload = await response.json();
        if (active && payload?.storefront) {
          writeZidStoreData(payload.storefront, storeSlug);
          setLiveStoreData(payload.storefront);
        }
      } catch { /* local slug-scoped cache remains the offline fallback */ }
    };
    void loadStorefront();
    const poll = window.setInterval(() => void loadStorefront(), 5000);
    return () => { active = false; window.clearInterval(poll); };
  }, [storeSlug]);

  const themeCustomization = (liveStoreData.themeCustomization || {}) as {
    storeLogoText?: string;
    desktopLogoUrl?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    announcementText?: string;
  };
  const storefrontMerchant: MerchantProfile = {
    ...merchant,
    ...(liveStoreData.merchant || {}),
    storeName: themeCustomization.storeLogoText || liveStoreData.merchant?.storeName || merchant.storeName,
    logoUrl: themeCustomization.desktopLogoUrl || liveStoreData.merchant?.logoUrl || merchant.logoUrl,
    heroTitle: themeCustomization.heroTitle || liveStoreData.merchant?.heroTitle || merchant.heroTitle,
    heroSubtitle: themeCustomization.heroSubtitle || liveStoreData.merchant?.heroSubtitle || merchant.heroSubtitle,
    heroImage: themeCustomization.heroImage || liveStoreData.merchant?.heroImage || merchant.heroImage,
    announcementText: themeCustomization.announcementText || liveStoreData.merchant?.announcementText || merchant.announcementText,
  };
  const storefrontProducts = Array.isArray(liveStoreData.products) ? liveStoreData.products : products;
  const storefrontMobileBanking = Array.isArray(liveStoreData.mobileBanking)
    ? liveStoreData.mobileBanking as MobileBankingConfig[]
    : mobileBanking;
  const storefrontBankAccounts = Array.isArray(liveStoreData.bankAccounts)
    ? liveStoreData.bankAccounts as BankAccount[]
    : bankAccounts;
  const enabledMobileMethods = storefrontMobileBanking.filter((method) => method.isEnabled && method.number.trim());
  const visibleBankAccount = storefrontBankAccounts.find((account) => account.isVisibleAtCheckout);
  const storefrontCategories = Array.isArray(liveStoreData.categories)
    ? liveStoreData.categories
        .filter((category): category is { name: string; status?: string } => !!category && typeof category === 'object' && typeof (category as { name?: unknown }).name === 'string')
        .filter((category) => category.status !== 'hidden')
        .map((category) => category.name)
    : [];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [cart, setCart] = useState<{product: Product, quantity: number, variant: string}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('customer@zidbd.com');
  const [authPassword, setAuthPassword] = useState('123456');
  const [authName, setAuthName] = useState('Sarah Ahmed');
  const [authPhone, setAuthPhone] = useState('01711000000');
  const [authNotice, setAuthNotice] = useState('');
  const [showOrderDashboard, setShowOrderDashboard] = useState(false);
  const [customerSession, setCustomerSession] = useState<{ email: string; name: string; phone: string } | null>(() => {
    try {
      const session = localStorage.getItem('zid_customer_session');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSplashVisible(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  // Checkout Form State
  const [custName, setCustName] = useState('Sarah Ahmed');
  const [custPhone, setCustPhone] = useState('01711000000');
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'bank' | 'cod'>('bkash');
  const [custCity, setCustCity] = useState('Dhaka');
  const [custAddress, setCustAddress] = useState('House 42, Road 11, Banani, Dhaka');
  const [custTxId, setCustTxId] = useState('');
  const [confirmedOrderNum, setConfirmedOrderNum] = useState('');

  useEffect(() => {
    const available = [
      ...enabledMobileMethods.map((method) => method.provider),
      ...(visibleBankAccount ? ['bank'] : []),
      ...(storefrontMerchant.paymentMethods.cod ? ['cod'] : []),
    ];
    if (!available.includes(payMethod)) setPayMethod((available[0] || 'cod') as typeof payMethod);
  }, [enabledMobileMethods, visibleBankAccount, storefrontMerchant.paymentMethods.cod, payMethod]);

  const selectedMobileMethod = enabledMobileMethods.find((method) => method.provider === payMethod);

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceBDT * item.quantity), 0);
  const shippingFee = storefrontMerchant.shippingConfig?.type === 'flat' ? storefrontMerchant.shippingConfig.fee : 0;
  const totalAmount = (cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0)) + shippingFee;

  const customerOrders = customerSession
    ? orders.filter((order) =>
        order.customerPhone === customerSession.phone ||
        order.customerName.toLowerCase() === customerSession.name.toLowerCase()
      )
    : [];

  const handleCustomerSessionPersist = (session: { email: string; name: string; phone: string }) => {
    try {
      localStorage.setItem('zid_customer_session', JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    setCustomerSession(session);
  };

  const handleCustomerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice('');

    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();
    const cleanName = authName.trim() || 'Zid Customer';
    const cleanPhone = authPhone.trim();

    if (!cleanEmail.includes('@') || !cleanPassword || !cleanPhone) {
      setAuthNotice('Please enter a valid email, password, and phone number to continue.');
      return;
    }

    const savedAccounts = (() => {
      try {
        const data = localStorage.getItem('zid_customer_accounts');
        if (data) {
          return JSON.parse(data);
        }
      } catch (e) {
        console.error(e);
      }
      return [
        {
          email: 'customer@zidbd.com',
          password: '123456',
          name: 'Sarah Ahmed',
          phone: '01711000000',
        },
      ];
    })();

    if (authMode === 'signin') {
      const existing = savedAccounts.find((account: any) => account.email.toLowerCase() === cleanEmail && account.password === cleanPassword);
      if (!existing) {
        setAuthNotice('No matching customer account was found. Try the demo account or create your own profile.');
        return;
      }
      handleCustomerSessionPersist({ email: existing.email, name: existing.name, phone: existing.phone });
      setAuthNotice('Signed in successfully. Your order dashboard is ready.');
      setIsAuthOpen(false);
      setShowOrderDashboard(true);
      return;
    }

    const updatedAccounts = [...savedAccounts.filter((account: any) => account.email.toLowerCase() !== cleanEmail), {
      email: cleanEmail,
      password: cleanPassword,
      name: cleanName,
      phone: cleanPhone,
    }];

    localStorage.setItem('zid_customer_accounts', JSON.stringify(updatedAccounts));
    handleCustomerSessionPersist({ email: cleanEmail, name: cleanName, phone: cleanPhone });
    setAuthNotice('Your new customer account has been created and synced locally.');
    setIsAuthOpen(false);
    setShowOrderDashboard(true);
  };

  const handleCustomerSignOut = () => {
    try {
      localStorage.removeItem('zid_customer_session');
    } catch (e) {
      console.error(e);
    }
    setCustomerSession(null);
    setShowOrderDashboard(false);
  };

  const handleAddToCart = (product: Product, variant = 'Default') => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.variant === variant);
      if (existing) {
        return prev.map(item => item.product.id === product.id && item.variant === variant
          ? { ...item, quantity: item.quantity + 1 }
          : item
        );
      }
      return [...prev, { product, quantity: 1, variant }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as any);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = '#' + Math.floor(100000 + Math.random() * 900000);
    setConfirmedOrderNum(orderNum);

    const items: OrderItem[] = cart.length > 0 ? cart.map((c, i) => ({
      id: `item-${i}`,
      productName: c.product.title,
      variant: c.variant,
      quantity: c.quantity,
      unitPriceBDT: c.product.priceBDT,
      image: c.product.image,
    })) : selectedProduct ? [{
      id: 'item-single',
      productName: selectedProduct.title,
      variant: 'Standard',
      quantity: 1,
      unitPriceBDT: selectedProduct.priceBDT,
      image: selectedProduct.image,
    }] : [];

    const total = cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      source: 'Store',
      customerName: custName,
      customerPhone: custPhone,
      customerCity: custCity,
      deliveryZone: custCity.toLowerCase().includes('dhaka') ? 'Inside Dhaka' : 'Outside Dhaka',
      address: custAddress,
      platform: 'Mobile web',
      totalBDT: total,
      paymentMethod: payMethod === 'bkash' ? 'bKash' : payMethod === 'nagad' ? 'Nagad' : payMethod === 'bank' ? 'Bank Transfer' : 'COD',
      paymentStatus: payMethod === 'cod' ? 'Unpaid' : 'Pending Verification',
      transactionId: custTxId || undefined,
      fulfillmentStatus: 'Unfulfilled',
      status: 'New',
      courierName: 'Steadfast Courier',
      trackingCode: 'SF-PENDING-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleString(),
      items,
    };

    onPlaceOrder(newOrder);
    setCheckoutStep('success');
    setCart([]);
  };

  // Ensure we have some products for the listing grid
  const displayProducts = storefrontProducts.filter(p => p.status === 'Active' || p.status === 'Published');

  return (
    <div className="min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-[#00D68F] selection:text-white">
      {isSplashVisible && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center animate-pulse">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-[28px] bg-[#00D68F] shadow-[0_0_50px_rgba(0,214,143,0.45)]">
              <span className="text-3xl font-black text-slate-950">Z</span>
              <div className="absolute -inset-2 rounded-[32px] border border-[#00D68F]/70 animate-ping" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-[#00D68F]">Zid BD</div>
              <div className="mt-2 text-2xl font-black text-white">Loading Storefront</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        {/* Top Announcement Bar */}
        <div className="bg-[#00D68F] text-slate-950 py-2 px-4 text-center text-xs font-bold tracking-wide">
          {storefrontMerchant.announcementText || '🎉 Free Nationwide Shipping across Bangladesh on Orders Over ৳2,000!'}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCheckoutStep('catalog')}>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                {storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}
              </h1>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-extrabold text-[#00D68F]">Home</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">Shop All</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">Sarees & Ethnic</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-red-500 hover:text-red-600 transition flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Flash Sale
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition">Track Order</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-48 lg:w-64 rounded-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-transparent focus:bg-white focus:border-[#00D68F] focus:ring-2 focus:ring-[#00D68F]/20 transition outline-none"
              />
            </div>
            {customerSession ? (
              <>
                <button
                  onClick={() => setShowOrderDashboard(true)}
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-[#00D68F] hover:text-slate-950 transition"
                >
                  <PackageCheck className="w-4 h-4" />
                  My Orders
                </button>
                <button
                  onClick={handleCustomerSignOut}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-[#00D68F] px-3 py-2 text-xs font-black text-slate-950 hover:bg-[#00E699] transition shadow"
              >
                <User className="w-4 h-4" />
                Customer Sign In
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-[#00D68F] transition"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center bg-[#00D68F] shadow">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg">
            <nav className="flex flex-col p-4 gap-4">
              <a href="#" className="text-sm font-extrabold text-[#00D68F]">Home</a>
              <a href="#" className="text-sm font-semibold text-slate-600">Shop All</a>
              <a href="#" className="text-sm font-semibold text-slate-600">Sarees & Ethnic</a>
              <a href="#" className="text-sm font-semibold text-red-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Flash Sale
              </a>
              <a href="#" className="text-sm font-semibold text-slate-600">Track Order</a>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full">
        
        {/* Catalog View */}
        {checkoutStep === 'catalog' && (
          <div className="space-y-0">
            
            {/* Image Carousel Hero Section */}
            <div className="w-full h-[320px] md:h-[450px] relative overflow-hidden bg-slate-900 group">
              <img 
                src={storefrontMerchant.heroImage || "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80"} 
                alt="Hero Banner" 
                className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent flex items-center">
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-xl space-y-4">
                    <span className="inline-block bg-[#00D68F] text-slate-950 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      New Arrivals
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                      {storefrontMerchant.heroTitle || 'Eid Ul Adha Special Collection 2026'}
                    </h2>
                    <p className="text-sm md:text-base text-slate-300">
                      {storefrontMerchant.heroSubtitle || 'Discover authentic Jamdani and modern ethnic wear with fast bKash checkout.'}
                    </p>
                    <button className="bg-[#00D68F] hover:bg-[#00E699] text-slate-950 font-black px-6 py-3 rounded-xl transition shadow-lg mt-2 inline-flex items-center gap-2">
                      Shop Collection <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
              
              {/* Popular Categories Bento Grid */}
              <section className="space-y-6">
                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Popular Categories</h2>
                    <p className="text-sm text-slate-500 mt-1">Shop by category</p>
                  </div>
                  <button className="text-sm font-bold text-[#00D68F] hover:underline cursor-pointer">View All</button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(storefrontCategories.length ? storefrontCategories : Array.from(new Set(displayProducts.map(p => p.category)))).slice(0, 4).map((cat, i) => {
                    const catProducts = displayProducts.filter(p => p.category === cat);
                    const image = catProducts[0]?.image;
                    return (
                      <div key={cat} className={`aspect-square bg-slate-100 rounded-2xl relative overflow-hidden group cursor-pointer border border-slate-200 shadow-sm ${i === 2 && (storefrontCategories.length || Array.from(new Set(displayProducts.map(p => p.category))).length) === 3 ? 'md:col-span-2' : ''}`}>
                        {image && <img src={image} alt={cat} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-4">
                          <h3 className="text-white font-bold text-base md:text-lg">{cat}</h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Trending In Dhaka Product Grid */}
              <section className="space-y-6">
                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Products</h2>
                    <p className="text-sm text-slate-500 mt-1">Discover this merchant's collection</p>
                  </div>
                  <button className="text-sm font-bold text-[#00D68F] hover:underline cursor-pointer">See More</button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {displayProducts.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                      <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
                      <h3 className="mt-4 text-lg font-extrabold text-slate-900">No products added yet</h3>
                      <p className="mt-2 text-sm text-slate-500">This merchant has not published products yet. Please check back soon.</p>
                    </div>
                  ) : displayProducts.map(p => (
                    <div 
                      key={p.id}
                      className="group flex flex-col justify-between bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all duration-300 relative"
                    >
                      {/* Optional Badge */}
                      {p.status === 'Active' && (
                        <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                          Hot Sale
                        </div>
                      )}

                      <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => {
                        setSelectedProduct(p);
                        setCheckoutStep('checkout');
                      }}>
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                        />
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{p.category}</p>
                          <h4 className="font-semibold text-sm md:text-base text-slate-900 line-clamp-2 leading-snug cursor-pointer hover:text-[#00D68F] transition"
                              onClick={() => { setSelectedProduct(p); setCheckoutStep('checkout'); }}>
                            {p.title}
                          </h4>
                          {p.titleBn && <p className="text-xs text-slate-500 mt-1">{p.titleBn}</p>}
                        </div>
                        
                        <div className="pt-2 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-lg font-black text-[#00D68F] tracking-tight">
                              ৳{p.priceBDT.toLocaleString()}
                            </div>
                            {p.compareAtPriceBDT && (
                              <div className="text-xs text-slate-400 line-through decoration-slate-300">
                                ৳{p.compareAtPriceBDT.toLocaleString()}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                            className="bg-slate-100 hover:bg-[#00D68F] hover:text-white text-slate-700 w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-sm"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Store Benefits Section */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center shadow-sm">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#00D68F] rounded-2xl flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Cash On Delivery</h4>
                    <p className="text-xs text-slate-500 mt-1">Available everywhere</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#00D68F] rounded-2xl flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">bKash Payment</h4>
                    <p className="text-xs text-slate-500 mt-1">Fast & secure gateway</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#00D68F] rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Authentic Products</h4>
                    <p className="text-xs text-slate-500 mt-1">100% genuine quality</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#00D68F] rounded-2xl flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Fast Shipping</h4>
                    <p className="text-xs text-slate-500 mt-1">Within 48 hours</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Checkout Flow */}
        {checkoutStep === 'checkout' && (
           <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <button
              onClick={() => setCheckoutStep('catalog')}
              className="text-sm flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-900 font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Catalog
            </button>
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Checkout</h3>
                <p className="text-sm mt-1 text-slate-500">Please provide your delivery details below.</p>
              </div>

              {/* Order Summary Items */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Order Summary</h4>
                
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
                      <img src={item.product.image} alt={item.product.title} className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-slate-900">{item.product.title}</h4>
                        <div className="text-xs text-slate-500">Qty: {item.quantity} | Variant: {item.variant}</div>
                      </div>
                      <div className="text-sm font-black text-[#00D68F]">৳{(item.product.priceBDT * item.quantity).toLocaleString()}</div>
                    </div>
                  ))
                ) : selectedProduct ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
                    <img src={selectedProduct.image} alt={selectedProduct.title} className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-slate-900">{selectedProduct.title}</h4>
                    </div>
                    <div className="text-sm font-black text-[#00D68F]">৳{selectedProduct.priceBDT.toLocaleString()}</div>
                  </div>
                ) : null}
                
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-600">Total Payable:</span>
                  <span className="text-xl font-black text-[#00D68F]">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full font-mono rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">City / District</label>
                    <select
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F] focus:border-transparent transition font-medium"
                    >
                      <option value="Dhaka">Dhaka (Inside Dhaka - ৳80)</option>
                      <option value="Chittagong">Chittagong (Outside Dhaka - ৳150)</option>
                      <option value="Sylhet">Sylhet (Outside Dhaka - ৳150)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Detailed Address</label>
                    <input
                      type="text"
                      required
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F] focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Payment Options */}
                <div className="pt-6 border-t border-slate-100">
                  <label className="block mb-3 font-bold text-sm text-slate-900">Select Payment Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {enabledMobileMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPayMethod(method.provider)}
                        className={`p-4 rounded-xl border text-sm font-bold transition flex items-center gap-3 cursor-pointer ${
                          payMethod === method.provider ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-pink-500" />
                        <span>{method.displayName}</span>
                      </button>
                    ))}
                    {visibleBankAccount && <button type="button" onClick={() => setPayMethod('bank')} className={`p-4 rounded-xl border text-sm font-bold transition flex items-center gap-3 ${payMethod === 'bank' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}><Building2 className="w-5 h-5" /><span>Bank transfer</span></button>}
                    {storefrontMerchant.paymentMethods?.cod && (
                      <button
                        type="button"
                        onClick={() => setPayMethod('cod')}
                        className={`p-4 rounded-xl border text-sm font-bold transition flex items-center gap-3 cursor-pointer ${
                          payMethod === 'cod' ? 'border-[#00D68F] bg-emerald-50 text-[#00A16B]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className={`w-5 h-5 ${payMethod === 'cod' ? 'text-[#00D68F]' : 'text-slate-400'}`} />
                        <span>Cash on Delivery</span>
                      </button>
                    )}
                  </div>
                </div>

                {payMethod === 'bkash' && (
                  <div className="border border-pink-200 p-5 rounded-2xl bg-pink-50/50 space-y-3">
                    <div className="text-xs font-bold text-pink-600 uppercase tracking-wider flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Send Money Instructions
                    </div>
                    <p className="text-sm text-slate-700">
                      Send exactly <strong className="text-slate-900">৳{totalAmount}</strong> to merchant bKash number <strong className="text-pink-600">01844990011</strong>. Paste the TrxID below:
                    </p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BK9X2810L9"
                      value={custTxId}
                      onChange={(e) => setCustTxId(e.target.value)}
                      className="w-full border border-pink-300 rounded-xl px-4 py-3 font-mono text-sm uppercase bg-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition"
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#00D68F] text-slate-950 font-black rounded-xl text-base hover:bg-[#00E699] transition cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    Confirm Order • ৳{totalAmount.toLocaleString()}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success View */}
        {checkoutStep === 'success' && (
          <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
              <Check className="w-12 h-12 text-[#00D68F]" />
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Order Placed Successfully!</h3>
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
              <p className="text-sm text-slate-600">
                Thank you <strong className="text-slate-900">{custName}</strong>. Your order has been placed.
              </p>
              <div className="flex justify-center items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">ORDER NUMBER:</span>
                <span className="bg-[#00D68F] text-white px-2 py-1 rounded font-bold">{confirmedOrderNum}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCheckoutStep('catalog');
                setSelectedProduct(null);
              }}
              className="px-8 py-3 bg-[#00D68F] text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer shadow-lg hover:bg-[#00E699]"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#00D68F]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#00D68F] border border-[#00D68F]/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Customer Account
                </div>
                <h3 className="mt-3 text-2xl font-black text-white">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h3>
                <p className="mt-1 text-xs text-slate-400">Track orders, manage your checkout profile, and return to your dashboard instantly.</p>
              </div>
              <button onClick={() => setIsAuthOpen(false)} className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
              <button
                onClick={() => setAuthMode('signin')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${authMode === 'signin' ? 'bg-[#00D68F] text-slate-950' : 'text-slate-400'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${authMode === 'signup' ? 'bg-[#00D68F] text-slate-950' : 'text-slate-400'}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleCustomerAuthSubmit} className="mt-5 space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-300">Full Name</label>
                  <input
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">Email Address</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder="customer@zidbd.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">Phone Number</label>
                <input
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                  placeholder="01711000000"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {authNotice && (
                <div className="rounded-xl border border-[#00D68F]/30 bg-[#00D68F]/10 px-3 py-2 text-xs text-[#8CFFDA]">{authNotice}</div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#00D68F] py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition"
              >
                {authMode === 'signin' ? 'Continue to Order Dashboard' : 'Create Customer Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showOrderDashboard && customerSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#00D68F]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#00D68F] border border-[#00D68F]/30">
                  <PackageCheck className="w-3.5 h-3.5" />
                  Order Dashboard
                </div>
                <h3 className="mt-3 text-2xl font-black text-slate-900">Welcome, {customerSession.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{customerSession.email} • {customerSession.phone}</p>
              </div>
              <button onClick={() => setShowOrderDashboard(false)} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {customerOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No orders are linked to this account yet. Place your first order from the storefront catalog.</div>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{order.orderNumber}</div>
                        <div className="mt-1 text-lg font-black text-slate-900">{order.paymentMethod}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#00D68F]">৳{order.totalBDT.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{order.fulfillmentStatus}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{order.createdAt}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00D68F]" />
                Your Cart
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                    <img src={item.product.image} alt={item.product.title} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.product.title}</h4>
                        <div className="text-sm font-black text-[#00D68F] mt-1">৳{item.product.priceBDT.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 w-fit rounded-lg px-2 py-1 mt-2">
                        <button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="font-bold px-1 text-slate-400 hover:text-slate-900">-</button>
                        <span className="text-xs font-bold text-slate-900 min-w-[16px] text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="font-bold px-1 text-slate-400 hover:text-slate-900">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-slate-500">Subtotal</span>
                  <span className="text-xl font-black text-[#00D68F]">৳{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('checkout');
                  }}
                  className="w-full py-4 bg-[#00D68F] text-slate-950 font-black rounded-xl text-base hover:bg-[#00E699] transition cursor-pointer shadow-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-white text-xl font-black">{storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}</h4>
            <p className="text-xs leading-relaxed max-w-sm">
              Bangladesh’s Premier Online Fashion & Lifestyle Destination. Powered by Zid Multi-Tenant SaaS Engine.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <ShieldCheck className="w-5 h-5 text-[#00D68F]" />
              <span className="text-xs font-bold text-white">Secure 256-bit SSL Checkout</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-[#00D68F] transition">About Us</a></li>
              <li><a href="#" className="hover:text-[#00D68F] transition">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-[#00D68F] transition">Return Policy</a></li>
              <li><a href="#" className="hover:text-[#00D68F] transition">Track Order</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold">Contact</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 01711-000000</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Banani, Dhaka</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
          © {new Date().getFullYear()} {storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
