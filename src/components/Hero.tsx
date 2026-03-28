import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Star, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  isDark: boolean;
  T: any;
}

const Hero: React.FC<HeroProps> = ({ isDark, T }) => {
  return (
    <div className="relative h-full min-h-[85vh] md:min-h-0 flex items-start md:items-center pt-32 pb-44 md:pt-0 md:pb-0 overflow-hidden">
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

        {/* Right Side: Redesigned Premium Info Cards */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.8, x: 100 }}
           animate={{ opacity: 1, scale: 1, x: 0 }}
           transition={{ delay: 0.5, duration: 1, type: 'spring', damping: 15 }}
           className="hidden lg:flex flex-col items-end relative gap-5"
        >
           {/* Primary Glass Card */}
           <motion.div 
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 1, 0]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              whileHover={{ scale: 1.05, rotate: -2, zIndex: 50 }}
              className={`p-7 rounded-[2.5rem] border-2 backdrop-blur-2xl max-w-xs relative overflow-hidden transition-all duration-500 ${
                 isDark 
                   ? 'bg-ink-900/70 border-white/10 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.8)]' 
                   : 'bg-white/90 border-brand-500/20 shadow-[0_40px_100px_-15px_rgba(245,179,29,0.15)]'
              }`}
           >
              {/* Decorative Accent */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                 <div className="relative">
                    <div className="bg-[#f5b31d] p-4 rounded-[1.5rem] text-ink-900 shadow-[0_15px_30px_-8px_rgba(245,179,29,0.5)] transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                       <ShieldCheck size={28} />
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-brand-500"
                    >
                       <Zap size={8} className="text-brand-500 fill-brand-500" />
                    </motion.div>
                 </div>
                 <div className="text-right">
                    <div className={`px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 mb-2 inline-block`}>
                       <p className="text-[#f5b31d] font-black text-[9px] uppercase tracking-[0.25em]">{T.stats.years}</p>
                    </div>
                 </div>
              </div>
              
              <h3 className={`text-2xl md:text-4xl font-black mb-4 leading-none tracking-tighter ${isDark ? 'text-white' : 'text-ink-900'} relative z-10`}>
                 {T.qualityTile.title}
              </h3>
              
              <p className={`text-sm md:text-base font-bold leading-relaxed mb-8 opacity-80 ${isDark ? 'text-ink-400' : 'text-ink-500'} relative z-10`}>
                 {T.qualityTile.desc}
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-ink-500/10 relative z-10">
                 <div className="flex flex-col gap-0.5">
                    <p className={`text-3xl lg:text-4xl font-black ${isDark ? 'text-white' : 'text-ink-900'} tracking-tighter`}>15k+</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#f5b31d] opacity-80">{T.stats.products}</p>
                 </div>
                 <div className="flex flex-col gap-0.5">
                    <p className={`text-3xl lg:text-4xl font-black ${isDark ? 'text-white' : 'text-ink-900'} tracking-tighter`}>20+</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#f5b31d] opacity-80">{T.stats.years}</p>
                 </div>
              </div>
           </motion.div>
           
           {/* Secondary Aesthetic Badge */}
           <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ 
                x: 0, 
                opacity: 1,
                y: [0, 10, 0]
              }}
              transition={{ 
                x: { delay: 1.2, duration: 0.8 },
                opacity: { delay: 1.2, duration: 0.8 },
                y: { delay: 2, duration: 5, repeat: Infinity, ease: "easeInOut" }
              }}
              whileHover={{ scale: 1.1, x: -5, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 px-7 rounded-full border-2 flex items-center gap-4 mr-12 cursor-pointer shadow-xl backdrop-blur-2xl group transition-all duration-300 ${
                isDark 
                  ? 'bg-ink-900/90 text-[#f5b31d] border-white/10 hover:bg-brand-500 hover:text-ink-900' 
                  : 'bg-white text-ink-900 border-brand-500/20 hover:bg-ink-900 hover:text-brand-500'
              }`}
           >
              <div className="relative">
                 <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 >
                    <Star size={20} className="fill-current" />
                 </motion.div>
                 <Sparkles className="absolute -top-2 -right-2 text-brand-500 opacity-50 transition-transform group-hover:scale-125" size={12} />
              </div>
              <div className="flex flex-col">
                 <span className="font-black text-[9px] uppercase tracking-[0.4em] leading-none mb-1 opacity-60">PREMIUM</span>
                 <span className="font-black text-base uppercase tracking-[0.1em] leading-none">{T.qualityTile.title.split(' ')[0]}</span>
              </div>
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
