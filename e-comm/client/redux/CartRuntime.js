"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { clearCartToast, hydrateCart } from "./slices/cartSlice";
import { getCartItems, setCartItems } from "../lib/cartStorage";

export default function CartRuntime() {
  const dispatch = useDispatch();
  const { hydrated, items, toastMessage } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(hydrateCart(getCartItems()));
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    setCartItems(items);
  }, [hydrated, items]);

  useEffect(() => {
    if (!toastMessage) return;
    toast.success(toastMessage, {
      position: "bottom-right",
      autoClose: 1800,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
      style: {
        width: "360px",
      },
    });
    dispatch(clearCartToast());
  }, [dispatch, toastMessage]);

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={1800}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
    />
  );
}
