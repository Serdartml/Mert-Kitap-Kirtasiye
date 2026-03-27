import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AnimatedBackground from './components/AnimatedBackground';
import { Language, translations } from './translations';

function App() {
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<Language>('tr');

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleLang = () => setLang(prev => prev === 'tr' ? 'en' : 'tr');
  
  const T = translations[lang];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-ink-900 text-white' : 'bg-white text-ink-900'} relative transition-colors duration-300 font-sans`}>
      <AnimatedBackground isDark={isDark} />
      <Navbar isDark={isDark} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} T={T.nav} />
      
      {/* 
          Main container scroller. 
          Snap-scroll is applied only to md (desktop/tablet).
      */}
      <main className={`relative z-10 w-full md:h-screen md:overflow-y-auto snap-container scroll-smooth`}>
        {/* Heroes & Categories: Normal h-screen Snap */}
        <section id="hero" className="w-full h-screen md:snap-start relative flex flex-col justify-center overflow-hidden flex-shrink-0">
          <Hero isDark={isDark} T={T.hero} />
        </section>
        
        <div id="kirtasiye" className="w-full h-screen md:snap-start relative flex items-center overflow-hidden flex-shrink-0">
          <Categories isDark={isDark} type="stationery" T={T.categories} />
        </div>

        <div id="kitap" className="w-full h-screen md:snap-start relative flex items-center overflow-hidden flex-shrink-0">
          <Categories isDark={isDark} type="books" T={T.categories} />
        </div>

        <div id="hediyelik" className="w-full h-screen md:snap-start relative flex items-center overflow-hidden flex-shrink-0">
          <Categories isDark={isDark} type="gifts" T={T.categories} />
        </div>
        
        {/* About Us & Contact: Extra limit scrolling (Reverted to 140vh) */}
        <div id="hakkimizda" className="w-full min-h-[140vh] md:snap-start relative flex flex-col items-center overflow-hidden py-32 md:py-40">
          <AboutUs isDark={isDark} T={T.about} />
        </div>

        <div id="iletisim" className="w-full min-h-[140vh] md:snap-start relative flex flex-col items-center overflow-hidden py-32 md:py-40">
          <Contact isDark={isDark} T={T.contact} />
        </div>

        <div id="footer" className="w-full md:snap-start relative flex items-center overflow-hidden flex-shrink-0">
          <Footer isDark={isDark} T={T.footer} lang={lang} />
        </div>
      </main>
    </div>
  );
}

export default App;
