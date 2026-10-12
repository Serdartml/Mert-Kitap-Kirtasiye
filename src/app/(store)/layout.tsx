import CartToast from "@/components/CartToast";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import QuickViewHost from "@/components/QuickViewHost";
import ScrollTop from "@/components/ScrollTop";
import Welcome from "@/components/Welcome";

export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Welcome />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Sayfa genelinde tek bir hızlı bakış penceresi ve sepet bildirimi. */}
      <QuickViewHost />
      <CartToast />
      <ScrollTop />
    </div>
  );
}
