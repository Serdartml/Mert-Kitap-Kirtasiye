import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Award, Users, MapPin, Sparkle } from 'lucide-react';

interface AboutUsProps {
  isDark: boolean;
  T: any;
}

const AboutUs: React.FC<AboutUsProps> = ({ isDark, T }) => {
  return (
    <div className={`w-full h-full flex items-center relative overflow-hidden transition-all duration-700 bg-transparent`}>
      {/* Background patterns */}
      <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] blur-[100px] opacity-10 rounded-full transition-all ${
        isDark ? 'bg-brand-500' : 'bg-brand-500/30'
      }`}></div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">
        {/* Left Side: Stats and Info */}
        <div className="flex flex-col justify-center max-w-2xl order-1 lg:order-1 pt-0">
          <motion.div
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkle className="text-[#f5b31d]" size={20}/>
              <span className={`font-black uppercase tracking-[0.3em] text-[10px] md:text-sm ${
                isDark ? 'text-brand-500' : 'text-brand-500'
              }`}>{T.badge}</span>
            </div>
            
            <h2 className={`text-4xl md:text-6xl lg:text-7xl font-black mb-6 lg:mb-10 leading-none tracking-tighter ${
              isDark ? 'text-white' : 'text-ink-900'
            }`}>
              {T.title1} <br /> <span className="text-[#f5b31d]">{T.title2}</span>
            </h2>
            
            <p className={`text-base md:text-xl lg:text-2xl font-bold leading-relaxed mb-10 transition-colors ${
              isDark ? 'text-ink-400' : 'text-ink-500'
            }`}>
              {T.desc}
            </p>
            
            <div className="grid gap-4 mb-12">
              {T.points.map((item: string, idx: number) => (
                <div key={idx} className="flex items-center gap-4 transition-transform hover:translate-x-1">
                  <div className="bg-[#f5b31d] p-1.5 rounded-lg text-ink-900 shadow-sm shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className={`font-black text-sm md:text-xl tracking-tight transition-colors ${isDark ? 'text-white' : 'text-ink-900'}`}>{item}</span>
                </div>
              ))}
            </div>

            {/* Clean Store Card - Now Linked to Maps */}
            <a 
               href="https://www.google.com/maps/dir/?api=1&destination=Erzene+Mah.+Kazim+Karabekir+Cad.+No:31/A+Izmir"
               target="_blank"
               rel="noopener noreferrer"
               className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[3rem] border-2 flex items-center gap-3 md:gap-4 transition-all mb-8 ${
                 isDark ? 'bg-ink-800 border-white/5 hover:border-brand-500/50' : 'bg-brand-50 border-brand-100 shadow-sm shadow-brand-500/5 hover:border-brand-500/50'
               }`}
            >
               <div className="bg-[#f5b31d] p-3 md:p-4 rounded-xl md:rounded-2xl text-ink-900 shadow-lg shrink-0"><MapPin size={24}/></div>
               <div>
                  <h4 className={`text-sm md:text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.visit}</h4>
                  <p className={`text-[9px] md:text-base font-bold text-ink-500`}>{T.address}</p>
               </div>
            </a>
          </motion.div>
        </div>

        {/* Right Side: Visual Showcase Card */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="relative order-2 lg:order-2 hidden lg:flex"
        >
          <div className={`w-full max-w-lg mx-auto rounded-[3.5rem] lg:rounded-[4.5rem] overflow-hidden shadow-2xl relative border-2 flex flex-col justify-center p-14 lg:p-20 transition-all duration-700 ${
             isDark ? 'bg-ink-800 border-white/5 hover:border-[#f5b31d]' : 'bg-white border-brand-500/20 hover:border-[#f5b31d]'
          }`}>
            <div className="relative z-10">
              <span className={`block font-black text-6xl md:text-8xl mb-6 italic opacity-20 tracking-tighter uppercase text-[#f5b31d]`}>Mert</span>
              <h3 className={`text-3xl md:text-5xl font-black mb-10 leading-tight ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.cardTitle}</h3>
              
              <div className="grid gap-10">
                 <div className="flex items-center gap-5">
                    <div className="bg-[#f5b31d] p-4 rounded-2xl text-ink-900 shadow-lg transition-transform hover:scale-110"><Award size={28} /></div>
                    <div>
                        <h5 className={`font-black text-xs uppercase tracking-[0.2em] ${isDark ? 'text-ink-400' : 'text-ink-400'}`}>{T.stats.quality}</h5>
                        <p className={`font-black text-lg md:text-2xl ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.stats.experience}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-5">
                    <div className="bg-[#f5b31d] p-4 rounded-2xl text-ink-900 shadow-lg transition-transform hover:scale-110"><Users size={28} /></div>
                    <div>
                        <h5 className={`font-black text-xs uppercase tracking-[0.2em] ${isDark ? 'text-ink-400' : 'text-ink-400'}`}>{T.stats.trust}</h5>
                        <p className={`font-black text-lg md:text-2xl ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.stats.customers}</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutUs;
