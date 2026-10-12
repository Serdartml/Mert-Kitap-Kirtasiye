// Tema sabitleri. Hem sunucudaki layout hem istemcideki ThemeToggle kullandığı için ayrı dosyada.

export const THEME_STORAGE_KEY = "theme";

// Tarayıcıya "bu sayfayı kendin karartma" diyen etiket. Bazı mobil tarayıcılar yalnızca CSS'teki
// color-scheme'e değil bu etikete bakar; o yüzden tema değiştikçe ikisi birlikte güncellenir.
export const COLOR_SCHEME_META_ID = "color-scheme-meta";
export const LIGHT_SCHEME = "only light";
export const DARK_SCHEME = "dark";

// VARSAYILAN TEMA KOYUDUR: sunucu çıktısı <html class="dark"> ve color-scheme "dark" ile başlar (app/layout.tsx),
// böylece hiçbir ilk boyamada beyaz parlama olmaz ve betik gecikse bile sayfa koyu açılır. Ziyaretçi düğmeyle
// "açık" temayı seçip kaydettiyse (localStorage "light") bu betik sayfa boyanmadan önce koyuyu kaldırır.
export const themeInitScript = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){document.documentElement.classList.remove("dark");var m=document.getElementById("${COLOR_SCHEME_META_ID}");if(m)m.setAttribute("content","${LIGHT_SCHEME}")}}catch(e){}`;
