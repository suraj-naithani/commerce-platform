"use client";

import { Provider } from "react-redux";
import CartRuntime from "./CartRuntime";
import store from "./store";

export function ReduxProvider({ children }) {
  return (
    <Provider store={store}>
      <CartRuntime />
      {children}
    </Provider>
  );
}
