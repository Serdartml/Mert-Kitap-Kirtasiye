import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Star, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  isDark: boolean;
  T: any;
}

const Hero: React.FC<HeroProps> = ({ isDark, T }) => {
  return (
    <div className="relative h-full flex items-center pt-24 md:pt-0 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/hero-bg.png" 
          alt="Mert Kitap Hero" 
          className="w-full h-full object-cover object-center opacity-40 md:opacity-50 blur-[1.5px]"
        />
        <div className={`absolute inset-0 ${isDark ? 'bg-ink-900/60' : 'bg-white/40'}`}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Main Content */}
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-8 md:w-12 bg-[#f5b31d]"></div>
            <span className={`text-[10px] md:text-sm font-black uppercase tracking-[0.4em] ${isDark ? 'text-brand-500' : 'text-brand-600'}`}>
              {T.tag}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-4xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9] tracking-tighter ${isDark ? 'text-white' : 'text-ink-900'}`}
          >
            {T.title1} <br />
            <span className="text-[#f5b31d]">{T.title2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-lg md:text-xl lg:text-2xl font-bold max-w-2xl mb-12 leading-relaxed ${isDark ? 'text-ink-400' : 'text-ink-500'}`}
          >
            {T.desc}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6"
          >
            <a
              href="#kirtasiye"
              className="px-8 md:px-10 py-5 md:py-6 bg-[#f5b31d] text-ink-900 rounded-2xl font-black text-lg md:text-xl shadow-2xl flex items-center justify-center gap-3 hover:bg-brand-400 transition-all active:scale-95 group"
            >
              {T.discover}
              <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </a>
            <a
              href="#hakkimizda"
              className={`px-8 md:px-10 py-5 md:py-6 rounded-2xl font-black text-lg md:text-xl border-2 transition-all active:scale-95 flex items-center justify-center gap-3 ${
                isDark 
                  ? 'border-white hover:bg-white hover:text-ink-900' 
                  : 'border-ink-900 hover:bg-ink-900 hover:text-white'
              }`}
            >
              <BookOpen size={24} />
              {T.about}
            </a>
          </motion.div>
        </div>

        {/* Right Side: Small Floating Info Card */}
        <motion.div 
           initial={{ opacity: 0, x: 50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.4, type: 'spring' }}
           className="hidden lg:flex flex-col items-end"
        >
           <div className={`p-8 rounded-[2.5rem] border-2 backdrop-blur-md max-w-sm transition-all duration-500 hover:scale-105 ${
              isDark ? 'bg-ink-900/80 border-white/5 shadow-2xl shadow-black' : 'bg-white/80 border-brand-500/10 shadow-2xl shadow-brand-500/10'
           }`}>
              <div className="flex items-center gap-4 mb-6">
                 <div className="bg-[#f5b31d] p-3 rounded-xl text-ink-900 shadow-lg">
                    <ShieldCheck size={28} />
                 </div>
                 <div>
                    <h3 className={`text-xl font-black leading-tight ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.qualityTile.title}</h3>
                    <p className="text-[#f5b31d] font-black text-[10px] uppercase tracking-widest">{T.stats.years}</p>
                 </div>
              </div>
              <p className={`text-base font-bold leading-relaxed mb-6 ${isDark ? 'text-ink-400' : 'text-ink-500'}`}>
                 {T.qualityTile.desc}
              </p>
              <div className="flex items-center gap-6 pt-6 border-t border-ink-500/10">
                 <div>
                    <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-ink-900'}`}>15k+</p>
                    <p className="text-[10px] font-black uppercase text-[#f5b31d]">{T.stats.products}</p>
                 </div>
                 <div className="w-px h-8 bg-ink-500/20"></div>
                 <div>
                    <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-ink-900'}`}>20+</p>
                    <p className="text-[10px] font-black uppercase text-[#f5b31d]">{T.stats.years}</p>
                 </div>
              </div>
           </div>
           
           {/* Sub-card/Badge */}
           <motion.div 
             animate={{ y: [0, -10, 0] }}
             transition={{ duration: 4, repeat: Infinity }}
             className={`mt-6 p-4 px-6 rounded-full border-2 flex items-center gap-3 self-center mr-12 ${
               isDark ? 'bg-brand-500 text-ink-900 border-white/10' : 'bg-ink-900 text-brand-500 border-ink-900'
             } shadow-xl`}
           >
              <Zap size={18} fill="currentColor" />
              <span className="font-black text-xs uppercase tracking-widest">{T.qualityTile.title.split(' ')[0]}</span>
           </motion.div>
        </motion.div>
      </div>

      {/* Decorative Circles in Background */}
      <div className="absolute top-1/2 -right-20 md:right-0 -translate-y-1/2 opacity-10 md:opacity-20 pointer-events-none z-5">
        <div className="relative">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
             className={`w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full border-[60px] md:border-[100px] ${isDark ? 'border-brand-500/10' : 'border-brand-500/5'}`}
           />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-10">
              <Sparkles className="text-brand-500 opacity-30" size={100} />
              <Star className="text-brand-500 opacity-20 ml-20" size={60} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
