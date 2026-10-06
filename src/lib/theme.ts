// Tema sabitleri. Hem sunucudaki layout hem istemcideki ThemeToggle kullandığı için ayrı dosyada.

export const THEME_STORAGE_KEY = "theme";

// Tarayıcıya "bu sayfayı kendin karartma" diyen etiket. Bazı mobil tarayıcılar yalnızca CSS'teki
// color-scheme'e değil bu etikete bakar; o yüzden tema değiştikçe ikisi birlikte güncellenir.
export const COLOR_SCHEME_META_ID = "color-scheme-meta";
export const LIGHT_SCHEME = "only light";
export const DARK_SCHEME = "dark";

// Sayfa boyanmadan önce <head> içinde çalışır; kayıtlı tema koyuysa html'e "dark" sınıfını ekler.
export const themeInitScript = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"){document.documentElement.classList.add("dark");var m=document.getElementById("${COLOR_SCHEME_META_ID}");if(m)m.setAttribute("content","${DARK_SCHEME}")}}catch(e){}`;
