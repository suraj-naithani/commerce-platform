"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../components/Button";
import CartItem from "../../components/CartItem";
import Spinner from "../../components/Spinner";
import { decrementCartItem, incrementCartItem, removeCartItem } from "../../redux/slices/cartSlice";

export default function CartPage() {
  const dispatch = useDispatch();
  const { items: cartItems, hydrated } = useSelector((state) => state.cart);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems],
  );
  const shipping = cartItems.length === 0 ? 0 : total > 50 ? 0 : 5;
  const grandTotal = total + shipping;

  const handleIncrement = (itemId) => {
    dispatch(incrementCartItem(itemId));
  };

  const handleDecrement = (itemId) => {
    dispatch(decrementCartItem(itemId));
  };

  const handleRemove = (itemId) => {
    dispatch(removeCartItem(itemId));
  };

  if (!hydrated) return <Spinner label="Loading cart..." />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-3xl font-semibold text-[#2f453b]">Your cart</h1>
        {cartItems.length === 0 ? (
          <p className="mt-6 text-sm text-[#6f867a]">Your cart is empty. Add products to continue.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-2xl border border-[#dbe7d4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2f453b]">Summary</h2>
        <div className="mt-4 flex items-center justify-between text-sm text-[#5f786b]">
          <span>Subtotal</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-[#5f786b]">
          <span>Shipping</span>
          <span>${shipping.toFixed(2)}</span>
        </div>
        <div className="mt-4 border-t border-[#e2ebdd] pt-4 text-base font-semibold text-[#2f453b]">
          Total: ${grandTotal.toFixed(2)}
        </div>
        {cartItems.length > 0 && (
          <Link href="/checkout" className="mt-5 block">
            <Button className="w-full">Proceed to checkout</Button>
          </Link>
        )}
      </aside>
    </div>
  );
}
