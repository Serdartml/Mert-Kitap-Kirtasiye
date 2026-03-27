import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, Heart, Layout, Globe, Star } from 'lucide-react';

const features = [
  { 
    title: 'Hızlı Teslimat', 
    desc: 'Okul ve ofis siparişlerinizde tüm bölgeye aynı gün teslimat seçeneği.', 
    icon: Zap, 
    color: 'text-brand-500',
    bg: 'bg-brand-500/10'
  },
  { 
    title: 'Kalite Garantisi', 
    desc: 'Dünyanın en seçkin kitap ve kırtasiye markalarını sizlerle buluşturuyoruz.', 
    icon: ShieldCheck, 
    color: 'text-green-500',
    bg: 'bg-green-500/10'
  },
  { 
    title: 'Sıfır Hata Politikası', 
    desc: 'Tüm siparişlerimizi büyük bir titizlikle hazırlar ve size ulaştırırız.', 
    icon: Star, 
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  { 
    title: 'Geniş Stok', 
    desc: 'On binlerce farklı ürün çeşidiyle aradığınızı anında bulabilirsiniz.', 
    icon: Layout, 
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  { 
    title: 'En İyi Fiyatlar', 
    desc: 'Eğitim ve öğretime destek olmak adına en rekabetçi fiyatları sunuyoruz.', 
    icon: Globe, 
    color: 'text-purple-500',
    bg: 'bg-purple-500/10'
  },
  { 
    title: 'Güleryüzlü Hizmet', 
    desc: '20 yılı aşkın tecrübemizle sizlere sıcak bir aile ortamı sunuyoruz.', 
    icon: Heart, 
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
];

const Features = () => {
  return (
    <section id="hakkimizda" className="py-24 bg-deep-900 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-brand-500 font-bold uppercase tracking-widest text-sm mb-4 inline-block"
            >
              BİZ KİMİZ?
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-white"
            >
              Mert Kitap Kırtasiye Farkını Yaşayın
            </motion.h2>
          </div>
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="bg-brand-500/10 border border-brand-500/20 px-8 py-4 rounded-3xl"
          >
             <span className="text-white font-bold text-2xl">20+ Yıl</span>
             <br />
             <span className="text-brand-400 text-sm font-medium">Sektör Tecrübesi</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-deep-800 p-10 rounded-[2.5rem] border border-deep-700 hover:border-brand-500/30 transition-all group"
            >
              <div className={`w-16 h-16 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <feature.icon size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-deep-300 leading-relaxed text-lg">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
