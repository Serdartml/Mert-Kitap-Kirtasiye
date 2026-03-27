import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send, Sparkle, Clock } from 'lucide-react';

interface ContactProps {
  isDark: boolean;
  T: any;
}

const Contact: React.FC<ContactProps> = ({ isDark, T }) => {
  return (
    <div className={`w-full h-full flex items-center relative overflow-hidden transition-all duration-700 bg-transparent`}>
      {/* Background patterns */}
      <div className={`absolute top-0 right-0 w-[400px] h-[400px] blur-[100px] opacity-10 rounded-full transition-all ${
        isDark ? 'bg-brand-500' : 'bg-brand-500/30'
      }`}></div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           whileInView={{ opacity: 1, x: 0 }}
           viewport={{ once: true }}
           className="h-full flex flex-col justify-center"
        >
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Sparkle className="text-[#f5b31d]" size={18}/>
            <span className={`font-black uppercase tracking-[0.3em] text-[9px] md:text-sm transition-colors ${
              isDark ? 'text-brand-500' : 'text-brand-600'
            }`}>{T.badge}</span>
          </div>
          
          <h2 className={`text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-black mb-8 md:mb-10 leading-none tracking-tighter ${
            isDark ? 'text-white' : 'text-ink-900'
          }`}>
            {T.title1} <br /> {T.title2} <br /> <span className="text-[#f5b31d]">{T.title3}</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
            {[
              { icon: Phone, title: T.info.call, contact: '+90 555 123 45 67', bg: 'bg-brand-500/10' },
              { icon: Mail, title: T.info.email, contact: 'merhaba@mertkitap.com', bg: 'bg-brand-500/10' },
              { icon: MapPin, title: T.info.visit, contact: T.info.visit === 'Visit' ? 'Mert Kitap, Istanbul Cad. No:12' : 'Mert Kitap, İstanbul Cad. No:12', bg: 'bg-brand-500/10' },
              { icon: Clock, title: T.info.hours, contact: T.info.schedule, bg: 'bg-brand-500/10' },
            ].map((item, idx) => (
              <motion.div 
                 key={item.title}
                 initial={{ opacity: 0, y: 15 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.1 }}
                 className="flex flex-col gap-2 group"
              >
                <div className={`w-8 h-8 md:w-12 md:h-12 ${item.bg} text-[#f5b31d] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                  <item.icon size={18} />
                </div>
                <div>
                  <h4 className={`font-black text-[9px] uppercase tracking-widest mb-1 text-ink-400`}>{item.title}</h4>
                  <p className={`text-sm md:text-base font-black transition-colors ${isDark ? 'text-white' : 'text-ink-900'}`}>{item.contact}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, x: 30, rotate: 1 }}
           whileInView={{ opacity: 1, x: 0, rotate: 0 }}
           viewport={{ once: true }}
           className={`p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border-2 transition-all ${
             isDark 
               ? 'bg-ink-800 border-white/5 shadow-black/50' 
               : 'bg-white border-brand-500/10 shadow-brand-500/5'
           }`}
        >
          <h3 className={`text-2xl md:text-3xl font-black mb-6 md:mb-8 ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.form.title}</h3>
          <form className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <input type="text" placeholder={T.form.name} className={`w-full rounded-xl p-3 md:p-5 font-black text-sm outline-none border-2 focus:ring-4 transition-all ${
                isDark 
                  ? 'bg-ink-900 border-ink-700 text-white focus:border-brand-500 focus:ring-brand-500/10' 
                  : 'bg-ink-50 border-ink-100 text-ink-900 focus:border-brand-500 focus:ring-brand-500/10'
              }`} />
              <input type="email" placeholder={T.form.email} className={`w-full rounded-xl p-3 md:p-5 font-black text-sm outline-none border-2 focus:ring-4 transition-all ${
                 isDark 
                   ? 'bg-ink-900 border-ink-700 text-white focus:border-brand-500 focus:ring-brand-500/10' 
                   : 'bg-ink-50 border-ink-100 text-ink-900 focus:border-brand-500 focus:ring-brand-500/10'
               }`} />
            </div>
            
            <textarea rows={3} placeholder={T.form.message} className={`w-full rounded-xl p-4 md:p-6 font-black text-sm outline-none border-2 focus:ring-4 resize-none transition-all ${
              isDark 
                ? 'bg-ink-900 border-ink-700 text-white focus:border-brand-500 focus:ring-brand-500/10' 
                : 'bg-ink-50 border-ink-100 text-ink-900 focus:border-brand-500 focus:ring-brand-500/10'
            }`}></textarea>
            
            <button className={`w-full p-5 md:p-6 rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 group ${
              isDark 
                ? 'bg-brand-500 text-ink-900 hover:bg-brand-400' 
                : 'bg-ink-900 text-brand-500 hover:bg-ink-800'
            }`}>
              {T.form.send}
              <Send size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
