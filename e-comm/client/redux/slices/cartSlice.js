import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  hydrated: false,
  toastMessage: "",
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.hydrated = true;
    },
    addToCart(state, action) {
      const product = action.payload;
      const existingItem = state.items.find((item) => String(item.id) === String(product.id));

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({
          id: String(product.id),
          name: product.name,
          price: Number(product.price) || 0,
          image: product.image || product.images?.[0] || "/file.svg",
          quantity: 1,
        });
      }

      state.toastMessage = `${product.name} added to cart`;
    },
    incrementCartItem(state, action) {
      const id = action.payload;
      const item = state.items.find((entry) => String(entry.id) === String(id));
      if (item) item.quantity += 1;
    },
    decrementCartItem(state, action) {
      const id = action.payload;
      const item = state.items.find((entry) => String(entry.id) === String(id));
      if (!item) return;
      item.quantity -= 1;
      state.items = state.items.filter((entry) => entry.quantity > 0);
    },
    removeCartItem(state, action) {
      const id = action.payload;
      state.items = state.items.filter((entry) => String(entry.id) !== String(id));
    },
    clearCartToast(state) {
      state.toastMessage = "";
    },
  },
});

export const { hydrateCart, addToCart, incrementCartItem, decrementCartItem, removeCartItem, clearCartToast } =
  cartSlice.actions;

export default cartSlice.reducer;
