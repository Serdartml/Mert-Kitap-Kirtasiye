import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Menu, X, Globe, ChevronRight, Pencil, Book, Compass, Pen, Palette } from 'lucide-react';
import Logo from './Logo';
import { Language } from '../translations';
import { AnimatedThemeToggler } from './AnimatedThemeToggler';
import AnimatedBackground from './AnimatedBackground';

interface NavbarProps {
  isDark: boolean;
  toggleTheme: () => void;
  lang: Language;
  toggleLang: () => void;
  T: any;
}

const Navbar: React.FC<NavbarProps> = ({ isDark, toggleTheme, lang, toggleLang, T }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector('main');
      const scrollTop = mainElement?.scrollTop || window.scrollY;
      setIsScrolled(scrollTop > 20);
    };
    
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      mainElement?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    const mainElement = document.querySelector('main');
    if (mainElement && window.innerWidth >= 768) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [activeHash, setActiveHash] = useState(window.location.hash || '#');

  useEffect(() => {
    const handleHashChange = () => setActiveHash(window.location.hash || '#');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isActive = (href: string) => {
    if (href === '#' && activeHash === '') return true;
    return activeHash === href;
  };

  const navLinks = [
    { name: T.home, href: '#', onClick: scrollToTop },
    { name: T.stationery, href: '#kirtasiye' },
    { name: T.books, href: '#kitap' },
    { name: T.gifts, href: '#hediyelik' },
    { name: T.about, href: '#hakkimizda' },
    { name: T.contact, href: '#iletisim' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${
        isDark 
          ? 'bg-ink-900 border-white/5' 
          : 'bg-white border-brand-500/10 shadow-sm'
      } ${
        isScrolled ? 'py-1 md:py-2' : 'py-2 md:py-3'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 h-12 md:h-20 flex items-center justify-between">
        {/* Smaller Logo for Mobile */}
        <Logo 
          isDark={isDark} 
          className="cursor-pointer transform scale-75 md:scale-100 origin-left hover:scale-105 transition-transform" 
          onClick={scrollToTop as any}
        />

        {/* Desktop Controls - Reverted to classic professional sizes */}
        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                onClick={link.onClick}
                className={`text-xs font-black uppercase tracking-widest hover:text-brand-500 transition-colors ${
                  isDark ? 'text-white' : 'text-ink-900'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>
          
          <div className="flex items-center gap-3 pl-6 border-l border-ink-500/10">
            <button 
              onClick={toggleLang}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-xs transition-all ${
                isDark ? 'bg-ink-800 text-brand-500 border border-white/5' : 'bg-brand-50 text-ink-900'
              }`}
            >
              <Globe size={14} className="text-[#f5b31d]" />
              {lang === 'tr' ? 'EN' : 'TR'}
            </button>

            <AnimatedThemeToggler 
              isDark={isDark}
              onToggle={toggleTheme}
              className={`p-2 rounded-xl transition-all h-10 w-10 flex items-center justify-center ${
                isDark 
                  ? 'bg-brand-500 text-ink-900' 
                  : 'bg-ink-900 text-brand-500'
              } active:scale-95`}
            />
          </div>
        </div>

        {/* Mobile Navbar Controls - Compacted */}
        <div className="md:hidden flex items-center gap-1">
          <button 
            onClick={toggleLang}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-black text-[9px] ${
               isDark ? 'text-[#f5b31d]' : 'text-ink-900'
            }`}
          >
             <Globe size={12} />
             {lang === 'tr' ? 'EN' : 'TR'}
          </button>
          <AnimatedThemeToggler 
            isDark={isDark}
            onToggle={toggleTheme}
            className={`p-1.5 h-8 w-8 flex items-center justify-center rounded-lg ${
              isDark ? 'text-[#f5b31d]' : 'text-ink-900'
            }`}
          />
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className={`p-1.5 ${isDark ? 'text-white' : 'text-ink-900'}`}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className={`fixed inset-0 z-[110] lg:hidden flex flex-col overflow-hidden ${isDark ? 'bg-ink-900' : 'bg-brand-50'}`}
          >
            {/* Stationery Items Animated Background */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
               {[...Array(15)].map((_, i) => {
                 const Icons = [Pencil, Book, Compass, Pen, Palette];
                 const Icon = Icons[i % Icons.length];
                 return (
                   <motion.div
                     key={i}
                     initial={{ opacity: 0 }}
                     animate={{ 
                       opacity: [0.03, 0.1, 0.03],
                       y: [Math.random() * 50, Math.random() * -150],
                       x: [Math.random() * 100, Math.random() * -100],
                       rotate: [0, 360]
                     }}
                     transition={{ 
                        duration: 15 + Math.random() * 20, 
                        repeat: Infinity, 
                        ease: 'linear',
                        delay: i * 0.5
                     }}
                     className={`absolute ${isDark ? 'text-brand-500' : 'text-brand-400'}`}
                     style={{ 
                       left: Math.random() * 95 + '%', 
                       top: Math.random() * 95 + '%',
                     }}
                   >
                     <Icon size={Math.random() * 30 + 30} />
                   </motion.div>
                 );
               })}
            </div>

            <div className="p-6 flex justify-between items-center border-b border-ink-500/10 relative z-20">
               <Logo isDark={isDark} className="scale-75 origin-left" />
               <button 
                 onClick={() => setMobileMenuOpen(false)} 
                 className={`p-3 rounded-2xl ${isDark ? 'bg-ink-800 text-brand-500' : 'bg-brand-50 text-ink-900'}`}
               >
                 <X size={24}/>
               </button>
            </div>
            
            <div className="flex-grow flex flex-col px-6 py-8 overflow-y-auto">
              <div className="flex flex-col gap-2">
                {navLinks.map((link, idx) => (
                  <motion.a 
                    key={link.name}
                    href={link.href}
                    onClick={(e) => { link.onClick?.(e); setMobileMenuOpen(false); }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * idx }}
                    whileTap={{ scale: 0.98 }}
                    className={`group relative p-[2px] rounded-2xl transition-all overflow-hidden flex-shrink-0 ${
                      isActive(link.href) ? 'shadow-lg shadow-brand-500/40' : 'shadow-sm border-white/5'
                    }`}
                  >
                    {/* Spiral Border Spinner - Visible on ALL buttons now */}
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ 
                          duration: isActive(link.href) ? 3 : 8, // Active is faster
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        className={`absolute inset-[-400%] z-0 ${
                          isActive(link.href) 
                            ? 'bg-[conic-gradient(from_0deg,transparent_40%,#f5b31d_70%,#f5b31d_100%)]'
                            : (isDark ? 'bg-[conic-gradient(from_0deg,transparent_90%,rgba(245,179,29,0.3)_100%)]' : 'bg-[conic-gradient(from_0deg,transparent_90%,rgba(245,179,29,0.2)_100%)]')
                        }`}
                      />

                    {/* Button Content */}
                    <div className={`relative z-10 w-full p-5 rounded-[14px] font-black uppercase tracking-tight text-xl flex items-center justify-between transition-all ${
                      isActive(link.href)
                        ? (isDark ? 'bg-ink-900 text-brand-500' : 'bg-white text-brand-500')
                        : (isDark ? 'bg-ink-800/90 text-white/80' : 'bg-white text-ink-900/80')
                    }`}>
                      <span>{link.name}</span>
                      <ChevronRight size={20} className={isActive(link.href) ? 'text-brand-500 animate-pulse' : 'text-ink-500 opacity-30'} />
                    </div>
                  </motion.a>
                ))}
              </div>
              
              <div className="mt-auto pt-10 grid grid-cols-2 gap-4">
                 <button onClick={toggleLang} className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-xs uppercase tracking-widest ${
                   isDark ? 'bg-ink-800 text-[#f5b31d]' : 'bg-brand-50 text-ink-900 border border-brand-200'
                 }`}>
                   <Globe size={16} />
                   {lang === 'tr' ? 'ENGLISH' : 'TÜRKÇE'}
                 </button>
                 <AnimatedThemeToggler 
                   isDark={isDark}
                   onToggle={toggleTheme}
                   className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-xs uppercase tracking-widest ${
                     isDark ? 'bg-brand-500 text-ink-900' : 'bg-ink-900 text-brand-500'
                   }`}
                 >
                   {isDark ? 'AYDINLIK' : 'KARANLIK'}
                 </AnimatedThemeToggler>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
