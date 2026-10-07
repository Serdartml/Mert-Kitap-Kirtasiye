import StoreLayout from "./(store)/layout";
import StoreNotFound from "./(store)/not-found";

// Hiçbir rotayla eşleşmeyen adresler buraya düşer ((store)/not-found yalnızca mağaza sayfalarının
// kendi notFound() çağrılarını karşılar). Aynı 404 sahnesi, mağazanın üst ve alt bölümüyle gösterilir.
export default function NotFound() {
  return (
    <StoreLayout>
      <StoreNotFound />
    </StoreLayout>
  );
}
