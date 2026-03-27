import React from 'react';
import { motion } from 'framer-motion';
import { Book, PenTool, Palette, Briefcase, GraduationCap, Gift, Heart, Star, Sparkle } from 'lucide-react';

interface CategoriesProps {
  isDark: boolean;
  type?: 'stationery' | 'books' | 'gifts';
  T: any;
}

const getIcon = (name: string) => {
  switch(name) {
    case 'Dolma Kalemler': case 'Fountain Pens': return PenTool;
    case 'Özel Defterler': case 'Special Notebooks': return Briefcase;
    case 'Çizim Setleri': case 'Drawing Sets': return Palette;
    case 'Ofis Araçları': case 'Office Tools': return GraduationCap;
    case 'Yeni Çıkanlar': case 'New Releases': return Book;
    case 'Sınav Hazırlık': case 'Exam Prep': return Star;
    case 'Çocuk Kitapları': case 'Children\'s Books': return Heart;
    case 'Klasik Eserler': case 'Classic Works': return Sparkle;
    case 'Özel Tasarım': case 'Custom Design': return Gift;
    case 'Hobi Setleri': case 'Hobby Sets': return Palette;
    case 'Koleksiyonluk': case 'Collectibles': return Star;
    case 'Aksesuarlar': case 'Accessories': return Sparkle;
    default: return Sparkle;
  }
};

const Categories: React.FC<CategoriesProps> = ({ isDark, type = 'stationery', T }) => {
  const currentData = T[type];

  return (
    <div className={`w-full h-full flex items-center relative overflow-hidden transition-all duration-700 bg-transparent`}>
      <div className="container mx-auto px-6 relative z-10 pt-20 md:pt-0">
        <div className="mb-8 md:mb-16 text-center lg:text-left">
          <motion.div 
             initial={{ opacity: 0, x: -20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="flex items-center justify-center lg:justify-start gap-3 mb-3"
          >
            <Sparkle className="text-[#f5b31d]" size={18}/>
            <span className={`block font-black text-[10px] uppercase transition-colors tracking-[0.2em] ${
              isDark ? 'text-brand-500' : 'text-brand-600'
            }`}>
               {currentData.badge}
            </span>
          </motion.div>
          <motion.h2 
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className={`text-3xl md:text-5xl lg:text-7xl font-black mb-4 tracking-tighter ${
               isDark ? 'text-white' : 'text-ink-900'
             }`}
          >
            {currentData.title}
          </motion.h2>
          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.1 }}
             className={`text-base md:text-xl lg:text-2xl font-bold max-w-2xl mx-auto lg:mx-0 ${
               isDark ? 'text-ink-500' : 'text-ink-500'
             }`}
          >
            {currentData.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
          {currentData.items.map((itemName: string, idx: number) => {
            const Icon = getIcon(itemName);
            return (
              <motion.div 
                key={itemName}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`p-5 md:p-10 rounded-3xl md:rounded-[3.5rem] border-2 group transition-all duration-300 relative overflow-hidden flex flex-col items-center lg:items-start text-center lg:text-left ${
                  isDark 
                  ? 'bg-ink-800 border-white/5 hover:border-[#f5b31d]' 
                  : 'bg-white border-brand-500/10 hover:border-[#f5b31d] shadow-sm shadow-brand-500/5'
                }`}
              >
                <div className="w-10 h-10 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center text-ink-900 bg-brand-500 group-hover:scale-110 transition-all shadow-lg mb-4 md:mb-10">
                  <Icon size={24} className="md:w-[40px] md:h-[40px]" />
                </div>
                <h3 className={`text-base md:text-2xl font-black mb-1 md:mb-3 truncate w-full transition-colors ${
                  isDark ? 'text-white' : 'text-ink-900 group-hover:text-brand-500'
                }`}>
                  {itemName}
                </h3>
                <p className={`text-xs md:text-lg font-black tracking-tight text-[#f5b31d]`}>
                  {idx % 2 === 0 ? '1.200+' : '800+'} {T.products}
                </p>
                <div className="mt-3 md:mt-8 w-8 h-1 bg-brand-500/20 rounded-full group-hover:w-full group-hover:bg-brand-500 transition-all"></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
