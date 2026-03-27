import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Menu, X, Globe, ChevronRight } from 'lucide-react';
import Logo from './Logo';
import { Language } from '../translations';

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

            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all h-10 w-10 flex items-center justify-center ${
                isDark 
                  ? 'bg-brand-500 text-ink-900' 
                  : 'bg-ink-900 text-brand-500'
              } active:scale-95`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
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
          <button 
            onClick={toggleTheme}
            className={`p-1.5 h-8 w-8 flex items-center justify-center rounded-lg ${
              isDark ? 'text-[#f5b31d]' : 'text-ink-900'
            }`}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
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
            className={`fixed inset-0 z-[110] lg:hidden flex flex-col ${isDark ? 'bg-ink-900' : 'bg-white'}`}
          >
            <div className="p-6 flex justify-between items-center border-b border-ink-500/10">
               <Logo isDark={isDark} className="scale-75 origin-left" />
               <button 
                 onClick={() => setMobileMenuOpen(false)} 
                 className={`p-3 rounded-2xl ${isDark ? 'bg-ink-800 text-brand-500' : 'bg-brand-50 text-ink-900'}`}
               >
                 <X size={24}/>
               </button>
            </div>
            
            <div className="flex-grow flex flex-col px-6 py-8 overflow-y-auto">
              <p className="text-[#f5b31d] font-black text-[10px] uppercase tracking-[0.3em] mb-8">{T.sections || 'BÖLÜMLER'}</p>
              <div className="flex flex-col gap-2">
                {navLinks.map((link, idx) => (
                  <motion.a 
                    key={link.name} 
                    href={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={(e) => { link.onClick?.(e); setMobileMenuOpen(false); }}
                    className={`flex items-center justify-between p-5 rounded-2xl text-xl font-black uppercase tracking-tight transition-all active:scale-[0.98] ${
                      isDark ? 'bg-ink-800/40 text-white' : 'bg-brand-50/50 text-ink-900'
                    }`}
                  >
                    {link.name}
                    <ChevronRight size={20} className="text-[#f5b31d]" />
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
                 <button onClick={toggleTheme} className={`flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-xs uppercase tracking-widest ${
                   isDark ? 'bg-brand-500 text-ink-900' : 'bg-ink-900 text-brand-500'
                 }`}>
                   {isDark ? <Sun size={16} /> : <Moon size={16} />}
                   {isDark ? 'AYDINLIK' : 'KARANLIK'}
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
