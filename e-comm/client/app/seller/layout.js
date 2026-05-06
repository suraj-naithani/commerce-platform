import SellerNav from "../../components/SellerNav";

export const metadata = {
  title: "Seller Dashboard - CartNest",
};

export default function SellerLayout({ children }) {
  return (
    <section>
      <SellerNav />
      {children}
    </section>
  );
}

