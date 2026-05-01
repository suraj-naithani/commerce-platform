import { configureStore } from "@reduxjs/toolkit";
import { productApi } from "./api/productApi";
import cartReducer from "./slices/cartSlice";

export const store = configureStore({
  reducer: {
    [productApi.reducerPath]: productApi.reducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(productApi.middleware),
});

export default store;
