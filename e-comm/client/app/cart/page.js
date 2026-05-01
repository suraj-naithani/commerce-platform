import Link from "next/link";
import Button from "../../components/Button";
import CartItem from "../../components/CartItem";
import { products } from "../../lib/data";

const cartItems = [
  { ...products[0], quantity: 1 },
  { ...products[1], quantity: 2 },
];

export default function CartPage() {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-3xl font-semibold text-[#2f453b]">Your cart</h1>
        <div className="mt-6 space-y-4">
          {cartItems.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2f453b]">Summary</h2>
        <div className="mt-4 flex items-center justify-between text-sm text-[#5f786b]">
          <span>Subtotal</span>
          <span>${total}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-[#5f786b]">
          <span>Shipping</span>
          <span>$5</span>
        </div>
        <div className="mt-4 border-t border-[#e2ebdd] pt-4 text-base font-semibold text-[#2f453b]">
          Total: ${total + 5}
        </div>
        <Link href="/checkout" className="mt-5 block">
          <Button className="w-full">Proceed to checkout</Button>
        </Link>
      </aside>
    </div>
  );
}
