const fs = require('fs');

const content = `import React, { useState } from 'react';
import { MerchantProfile, Product, BankAccount, MobileBankingConfig, Order, OrderItem, ThemeConfig } from '../types';
import { ShoppingBag, X, Check, CreditCard, Building2, Smartphone, ShieldCheck, Search, Globe, Phone, MapPin, ArrowRight, ExternalLink, Clock } from 'lucide-react';

interface TenantStorefrontViewProps {
  storeSlug: string;
  merchant: MerchantProfile;
  products: Product[];
  bankAccounts: BankAccount[];
  mobileBanking: MobileBankingConfig[];
  themes: ThemeConfig[];
  onPlaceOrder: (order: Order) => void;
}

export const TenantStorefrontView: React.FC<TenantStorefrontViewProps> = ({
  storeSlug,
  merchant,
  products,
  bankAccounts,
  mobileBanking,
  themes,
  onPlaceOrder,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [cart, setCart] = useState<{product: Product, quantity: number, variant: string}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout Form State
  const [custName, setCustName] = useState('Sarah Ahmed');
  const [custPhone, setCustPhone] = useState('01711000000');
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'bank' | 'cod'>('bkash');
  const [custCity, setCustCity] = useState('Dhaka');
  const [custAddress, setCustAddress] = useState('House 42, Road 11, Banani, Dhaka');
  const [custTxId, setCustTxId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmedOrderNum, setConfirmedOrderNum] = useState('');

  // Inject Tracking Scripts
  React.useEffect(() => {
    if (merchant.tracking.fbPixelId) console.log(\`Injecting FB Pixel: \${merchant.tracking.fbPixelId}\`);
    if (merchant.tracking.tiktokPixelId) console.log(\`Injecting TikTok Pixel: \${merchant.tracking.tiktokPixelId}\`);
    if (merchant.tracking.ga4Id) console.log(\`Injecting GA4: \${merchant.tracking.ga4Id}\`);
  }, [merchant.tracking]);

  // Filter products for this tenant store slug (or all if matches)
  const tenantProducts = products.filter(p => p.status === 'Active' || p.status === 'Published');
  const filteredProducts = tenantProducts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceBDT * item.quantity), 0);
  const shippingFee = merchant.shippingConfig.type === 'flat' ? merchant.shippingConfig.fee : 0;
  const totalAmount = (cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0)) + shippingFee;

  const activeTheme = themes.find(t => t.id === merchant.activeThemeId) || themes[0];

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
      id: \`item-\${i}\`,
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
      id: \`ord-\${Date.now()}\`,
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

  // Dynamic Categories from live products
  const uniqueCategories = Array.from(new Set(tenantProducts.map(p => p.category)));
  const dynamicCategories = uniqueCategories.map(cat => {
    const catProducts = tenantProducts.filter(p => p.category === cat);
    return {
      name: cat,
      count: \`\${catProducts.length} Items\`,
      image: catProducts[0]?.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80'
    };
  });

  return (
    <div className="min-h-screen font-sans bg-white text-slate-900 selection:text-white" style={{ '--theme-primary': activeTheme.primaryColor } as any}>
      <style dangerouslySetInnerHTML={{__html: \`
        ::selection { background-color: \${activeTheme.primaryColor}; }
      \`}} />
      
      {/* Top Multi-Tenant Store Notice Bar */}
      <div className="bg-slate-900 text-slate-300 border-b border-slate-800 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTheme.primaryColor }} />
          <span>Multi-Tenant Storefront: <strong className="text-white font-bold">/{storeSlug}</strong></span>
          <span className="text-slate-500">|</span>
          <span className="font-semibold" style={{ color: activeTheme.primaryColor }}>{merchant.announcementText || \`\${merchant.storeName} Official E-Commerce Portal\`}</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-slate-400 hover:text-white flex items-center gap-1 transition">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Merchant Admin Dashboard</span>
          </a>
        </div>
      </div>

      {/* Store Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b bg-white/95 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {merchant.logoUrl ? (
              <img src={merchant.logoUrl} alt={merchant.storeName} className="w-11 h-11 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-11 h-11 rounded-xl text-slate-950 font-black text-lg flex items-center justify-center" style={{ backgroundColor: activeTheme.primaryColor }}>
                {merchant.storeName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">{merchant.storeName}</h1>
              <div className="text-[11px] font-mono flex items-center gap-1.5 text-slate-500">
                <Globe className="w-3 h-3" style={{ color: activeTheme.primaryColor }} />
                <span>store.zid.sa/{storeSlug}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none border bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 transition"
                style={{ '--tw-ring-color': activeTheme.primaryColor, '--tw-border-opacity': 1 } as any}
              />
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 border rounded-xl transition flex items-center gap-2 cursor-pointer bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
            >
              <ShoppingBag className="w-5 h-5" style={{ color: activeTheme.primaryColor }} />
              <span className="text-xs font-bold hidden sm:inline">Cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow" style={{ backgroundColor: activeTheme.primaryColor }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Catalog View */}
        {checkoutStep === 'catalog' && (
          <div className="space-y-12">
            
            {/* Hero Banner */}
            <div style={{ backgroundColor: activeTheme.secondaryColor }} className="relative rounded-3xl border border-slate-200 p-8 sm:p-12 overflow-hidden shadow-2xl">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none" style={{ backgroundImage: \`radial-gradient(\${activeTheme.primaryColor} 1px, transparent 1px)\`, backgroundSize: '16px 16px' }} />
              
              <div className="relative z-10 max-w-2xl space-y-4">
                <span style={{ color: activeTheme.primaryColor, borderColor: activeTheme.primaryColor }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/10 border text-xs font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Merchant Store
                </span>
                <h2 style={{ fontFamily: activeTheme.bannerTypography, color: '#FFFFFF' }} className="text-3xl sm:text-4xl font-black tracking-tight">
                  {merchant.heroTitle}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {merchant.heroSubtitle}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 px-3.5 py-2 rounded-xl border border-white/10">
                    <Check className="w-4 h-4" style={{ color: activeTheme.primaryColor }} />
                    <span>100% Authentic Products</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/30 px-3.5 py-2 rounded-xl border border-white/10">
                    <Check className="w-4 h-4" style={{ color: activeTheme.primaryColor }} />
                    <span>Secure bKash / Nagad Gateway</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Categories Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Popular Categories</h3>
                  <p className="text-xs text-slate-500">Explore our top collections</p>
                </div>
                <button style={{ color: activeTheme.primaryColor }} className="text-xs font-bold transition flex items-center gap-1 hover:opacity-80 cursor-pointer">
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dynamicCategories.map((cat, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-md">
                    <div className="aspect-[4/3] w-full">
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 bg-slate-100" 
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-white font-extrabold text-sm mb-1">{cat.name}</h4>
                      <span className="text-xs font-medium text-slate-300">{cat.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Catalog Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Trending Products</h3>
                  <p className="text-xs text-slate-500">Showing {filteredProducts.length} available items in stock</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    className={\`overflow-hidden transition-all duration-300 flex flex-col justify-between group \${activeTheme.productCardStyle === 'flat' ? 'bg-transparent border-0' : 'bg-white border border-slate-200 rounded-2xl'} \${activeTheme.productCardStyle === 'elevated' ? 'shadow-xl hover:shadow-2xl' : 'shadow-sm hover:shadow-md'}\`}
                  >
                    <div>
                      <div className="relative overflow-hidden aspect-square bg-slate-100">
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                        />
                        <div style={{ color: activeTheme.primaryColor, borderColor: activeTheme.primaryColor }} className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border text-[10px] font-bold shadow-sm">
                          {p.category}
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <h4 className="font-bold text-sm line-clamp-1 transition text-slate-800 hover:text-slate-600">
                          {p.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div style={{ color: activeTheme.primaryColor }} className="text-base font-black">
                            ৳{p.priceBDT.toLocaleString()} <span className="text-xs text-slate-500 font-normal">BDT</span>
                          </div>
                          {p.compareAtPriceBDT && (
                            <div className="text-xs text-slate-400 line-through">
                              ৳{p.compareAtPriceBDT.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setCheckoutStep('checkout');
                        }}
                        style={{ backgroundColor: activeTheme.primaryColor }}
                        className="py-2.5 px-3 text-slate-950 font-extrabold rounded-xl text-xs transition cursor-pointer text-center hover:brightness-110 shadow-sm"
                      >
                        Buy Now
                      </button>
                      <button
                        onClick={() => handleAddToCart(p)}
                        className="py-2.5 px-3 font-bold rounded-xl text-xs transition cursor-pointer border text-center bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                      >
                        + Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Checkout Flow */}
        {checkoutStep === 'checkout' && (
           <div className="max-w-2xl mx-auto space-y-6">
            <button
              onClick={() => setCheckoutStep('catalog')}
              className="text-xs flex items-center gap-1 cursor-pointer text-slate-500 hover:text-slate-900 font-medium"
            >
              ← Return to Catalog
            </button>
            
            <div className="border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 bg-white border-slate-200">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Secure Checkout</h3>
                <p className="text-xs mt-0.5 text-slate-500">Complete your order with {merchant.storeName}</p>
              </div>

              {/* Order Summary Item */}
              {selectedProduct && (
                <div className="border rounded-2xl p-4 flex items-center gap-4 bg-slate-50 border-slate-200">
                  <img src={selectedProduct.image} alt={selectedProduct.title} className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-800">{selectedProduct.title}</h4>
                    <div className="text-sm font-black mt-1" style={{ color: activeTheme.primaryColor }}>৳{selectedProduct.priceBDT.toLocaleString()} BDT</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 border bg-slate-50 border-slate-200 text-slate-900 focus:outline-none transition"
                      style={{ '--tw-ring-color': activeTheme.primaryColor } as any}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full font-mono rounded-xl px-3.5 py-2.5 border bg-slate-50 border-slate-200 text-slate-900 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">City / District</label>
                    <select
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 border bg-slate-50 border-slate-200 text-slate-900 focus:outline-none transition"
                    >
                      <option value="Dhaka">Dhaka (Inside Dhaka - ৳80)</option>
                      <option value="Chittagong">Chittagong (Outside Dhaka - ৳150)</option>
                      <option value="Sylhet">Sylhet (Outside Dhaka - ৳150)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-slate-700">Delivery Address</label>
                    <input
                      type="text"
                      required
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 border bg-slate-50 border-slate-200 text-slate-900 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Payment Options */}
                <div className="pt-2">
                  <label className="block mb-2 font-bold uppercase tracking-wider text-[10px] text-slate-600">Select Payment Method:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {merchant.paymentMethods.bkash && (
                      <button
                        type="button"
                        onClick={() => setPayMethod('bkash')}
                        className={\`p-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer \${
                          payMethod === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }\`}
                      >
                        <Smartphone className="w-4 h-4 text-pink-500" />
                        <span>bKash Direct</span>
                      </button>
                    )}
                    {merchant.paymentMethods.cod && (
                      <button
                        type="button"
                        onClick={() => setPayMethod('cod')}
                        className={\`p-3.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer \${
                          payMethod === 'cod' ? 'bg-slate-50 shadow-sm text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }\`}
                        style={payMethod === 'cod' ? { borderColor: activeTheme.primaryColor } : {}}
                      >
                        <Building2 className="w-4 h-4" style={payMethod === 'cod' ? { color: activeTheme.primaryColor } : {}} />
                        <span>Cash on Delivery</span>
                      </button>
                    )}
                  </div>
                </div>

                {payMethod === 'bkash' && (
                  <div className="border p-4 rounded-2xl space-y-3 bg-pink-50 border-pink-200">
                    <div className="text-[11px] font-bold text-pink-600">bKash Merchant Payment Instruction</div>
                    <p className="text-[11px] leading-relaxed text-slate-700">
                      Please send <strong className="text-slate-900">৳{totalAmount}</strong> to bKash Merchant number <strong className="text-pink-600">01844990011</strong> via Send Money / Payment, and paste your 10-digit Transaction ID below:
                    </p>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BK9X2810L9"
                      value={custTxId}
                      onChange={(e) => setCustTxId(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 font-mono text-xs uppercase focus:outline-none bg-white border-pink-300 text-slate-900 focus:border-pink-500 shadow-sm"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 text-slate-950 font-extrabold rounded-2xl text-xs transition cursor-pointer shadow-lg hover:brightness-110"
                  style={{ backgroundColor: activeTheme.primaryColor }}
                >
                  Place Order Now (৳{totalAmount.toLocaleString()} BDT)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Success View */}
        {checkoutStep === 'success' && (
          <div className="max-w-md mx-auto text-center space-y-6 py-12 border rounded-3xl p-8 shadow-2xl bg-white border-slate-200">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm" style={{ backgroundColor: \`\${activeTheme.primaryColor}20\`, borderColor: activeTheme.primaryColor, color: activeTheme.primaryColor, borderWidth: 1 }}>
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border" style={{ color: activeTheme.primaryColor, backgroundColor: \`\${activeTheme.primaryColor}10\`, borderColor: \`\${activeTheme.primaryColor}30\` }}>
                Order {confirmedOrderNum}
              </span>
              <h3 className="text-2xl font-black text-slate-900">Order Placed Successfully!</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Thank you <strong className="text-slate-900">{custName}</strong>! Your order has been registered under merchant <strong className="text-slate-900">{merchant.storeName}</strong>. Real-time courier dispatch status will be sent via SMS.
              </p>
            </div>

            <button
              onClick={() => {
                setCheckoutStep('catalog');
                setSelectedProduct(null);
              }}
              className="w-full py-3 text-slate-950 font-bold rounded-2xl text-xs transition cursor-pointer shadow-sm hover:brightness-110"
              style={{ backgroundColor: activeTheme.primaryColor }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md border-l h-full flex flex-col justify-between p-6 shadow-2xl bg-white border-slate-200">
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200">
                <h3 className="font-extrabold text-base flex items-center gap-2 text-slate-900">
                  <ShoppingBag className="w-5 h-5" style={{ color: activeTheme.primaryColor }} />
                  <span>Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 bg-slate-100 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="border p-3 rounded-2xl flex items-center gap-3 bg-slate-50 border-slate-200">
                      <img src={item.product.image} alt={item.product.title} className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                      <div className="flex-1">
                        <h4 className="font-bold text-xs line-clamp-1 text-slate-800">{item.product.title}</h4>
                        <div className="text-xs font-black mt-0.5" style={{ color: activeTheme.primaryColor }}>৳{item.product.priceBDT.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded-xl border bg-white border-slate-200">
                        <button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="font-bold px-1 text-slate-400 hover:text-slate-800 transition">-</button>
                        <span className="text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="font-bold px-1 text-slate-400 hover:text-slate-800 transition">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-4 border-slate-200">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="text-base text-slate-900">৳{cartTotal.toLocaleString()} BDT</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setSelectedProduct(cart[0].product);
                    setCheckoutStep('checkout');
                  }}
                  className="w-full py-3.5 text-slate-950 font-extrabold rounded-2xl text-xs transition shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:brightness-110"
                  style={{ backgroundColor: activeTheme.primaryColor }}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Footer */}
      <footer className="border-t py-8 mt-16 text-center text-xs space-y-2 bg-slate-50 border-slate-200 text-slate-500">
        <p>© 2026 {merchant.storeName}. Powered by Zid Multi-Tenant SaaS Engine.</p>
        <p className="font-mono text-[10px] text-slate-400">Secure 256-bit SSL Encryption • Steadfast & bKash Integrated</p>
      </footer>
    </div>
  );
};
`;
fs.writeFileSync('src/components/TenantStorefrontView.tsx', content);
