import Button from "../../components/Button";
import Input from "../../components/Input";
import { products } from "../../lib/data";

export default function CheckoutPage() {
  const orderItems = products.slice(0, 2);
  const subtotal = orderItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-[#2f453b]">Checkout</h1>
        <p className="mt-2 text-sm text-[#6e877a]">Simple and secure details form. Stripe button ready below.</p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input placeholder="First name" />
          <Input placeholder="Last name" />
          <Input className="sm:col-span-2" placeholder="Email address" type="email" />
          <Input className="sm:col-span-2" placeholder="Street address" />
          <Input placeholder="City" />
          <Input placeholder="Postal code" />
        </form>

        <Button className="mt-6">Pay with Stripe</Button>
      </section>

      <aside className="h-fit rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2f453b]">Order summary</h2>
        <div className="mt-4 space-y-3">
          {orderItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm text-[#5f786b]">
              <span>{item.name}</span>
              <span>${item.price}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-[#e2ebdd] pt-4 text-base font-semibold text-[#2f453b]">
          Total: ${subtotal}
        </div>
      </aside>
    </div>
  );
}
