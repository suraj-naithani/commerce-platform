export const MERCHANT_TOKEN_KEY = "merchantToken";

export function getMerchantToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(MERCHANT_TOKEN_KEY) || "";
}

export function setMerchantToken(token) {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem(MERCHANT_TOKEN_KEY);
  else window.localStorage.setItem(MERCHANT_TOKEN_KEY, token);
}

