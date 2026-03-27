import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart, Sparkle } from 'lucide-react';
import Logo from './Logo';

interface FooterProps {
  isDark: boolean;
  T: any;
  lang: string;
}

const Footer: React.FC<FooterProps> = ({ isDark, T, lang }) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className={`w-full py-16 md:py-24 transition-all duration-700 ${
      isDark ? 'bg-ink-900/40' : 'bg-ink-50'
    }`}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-20 mb-16 md:mb-24">
          {/* Brand Info */}
          <div className="space-y-6 md:space-y-10">
            <Logo isDark={isDark} />
            <p className={`text-lg md:text-xl font-bold leading-relaxed transition-colors ${isDark ? 'text-ink-400' : 'text-ink-500'}`}>
              {T.desc}
            </p>
            <div className="flex items-center gap-3">
               <ShieldCheck className="text-[#f5b31d]" size={20} />
               <span className={`font-black text-xs md:text-sm uppercase tracking-widest ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>{T.guarantee}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6 md:space-y-10">
            <h4 className={`text-base md:text-lg font-black uppercase tracking-[0.3em] ${
               isDark ? 'text-white' : 'text-ink-900'
            }`}>{T.sections}</h4>
            <ul className="space-y-4 md:space-y-6">
              {['Kırtasiye', 'Kitap', 'Hediyelik', 'Hakkımızda', 'İletişim'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(' ', '')}`} className={`text-base md:text-lg font-bold hover:text-[#f5b31d] transition-all flex items-center gap-4 group ${
                    isDark ? 'text-ink-400' : 'text-ink-400'
                  }`}>
                    <div className="w-1.5 h-1.5 bg-[#f5b31d] rounded-full scale-0 group-hover:scale-100 transition-transform"></div>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Store Info */}
          <div className="space-y-6 md:space-y-10">
            <h4 className={`text-base md:text-lg font-black uppercase tracking-[0.3em] ${
               isDark ? 'text-white' : 'text-ink-900'
            }`}>{T.store}</h4>
            <ul className="space-y-6 md:space-y-8">
              <li className="flex gap-4 md:gap-6">
                <MapPin className="text-[#f5b31d] shrink-0" size={24} />
                <span className={`font-bold text-base md:text-lg leading-relaxed transition-colors ${isDark ? 'text-ink-300' : 'text-ink-500'}`}>
                   {lang === 'tr' ? 'İstanbul Cad. No: 12, Pınar Mah. Merkez, İstanbul' : '12 Istanbul St., Pinar Mah. Center, Istanbul'}
                </span>
              </li>
              <li className="flex gap-4 md:gap-6 items-center">
                <Phone className="text-[#f5b31d] shrink-0" size={20} />
                <span className={`font-black text-lg md:text-xl transition-colors ${isDark ? 'text-white' : 'text-ink-900'}`}>+90 555 123 45 67</span>
              </li>
              <li className="flex gap-4 md:gap-6 items-center">
                <Mail className="text-[#f5b31d] shrink-0" size={20} />
                <span className={`font-bold text-base md:text-lg underline underline-offset-8 decoration-brand-500/30 ${isDark ? 'text-white' : 'text-ink-900'}`}>iletisim@mertkitap.com</span>
              </li>
            </ul>
          </div>

          {/* Working Hours */}
          <div className="space-y-6 md:space-y-10">
             <h4 className={`text-base md:text-lg font-black uppercase tracking-[0.3em] ${
                isDark ? 'text-white' : 'text-ink-900'
             }`}>{T.hoursTitle}</h4>
             <div className={`p-6 md:p-8 rounded-[2rem] border-2 space-y-4 md:space-y-6 transition-all shadow-sm ${
                isDark ? 'bg-ink-800 border-ink-700' : 'bg-white border-brand-500/10'
             }`}>
                <div className="flex items-center justify-between">
                   <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-ink-900'}`}>
                      <Clock size={16} className="text-[#f5b31d]"/> {T.days}
                   </div>
                   <div className="text-[#f5b31d] font-black text-base md:text-lg">08:00 - 20:00</div>
                </div>
                <div className="flex items-center justify-between opacity-50">
                   <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-wider ${isDark ? 'text-white' : 'text-ink-900'}`}>
                      <Clock size={16} className="text-[#f5b31d]"/> {T.sunday}
                   </div>
                   <div className={`font-black uppercase text-xs ${isDark ? 'text-white' : 'text-ink-900'}`}>{T.closed}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`pt-8 md:pt-12 border-t flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 transition-colors ${
           isDark ? 'border-white/5' : 'border-ink-100'
        }`}>
          <p className={`font-black text-[10px] md:text-xs uppercase tracking-[0.3em] text-center md:text-left ${
            isDark ? 'text-ink-700' : 'text-ink-300'
          }`}>
            © {currentYear} Mert Kitap Kırtasiye. <br className="md:hidden"/> 
            Designed for Excellence.
          </p>
          <div className="flex items-center gap-6 md:gap-10">
            {['Gizlilik', 'KVKK'].map(l => (
              <a key={l} href="#" className={`text-[10px] md:text-xs font-black uppercase tracking-widest hover:text-brand-500 transition-colors ${
                isDark ? 'text-ink-700' : 'text-ink-300'
              }`}>{l}</a>
            ))}
            <Heart size={16} className="text-[#f5b31d] fill-[#f5b31d] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
