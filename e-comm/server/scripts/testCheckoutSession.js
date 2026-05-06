async function main() {
  const productsRes = await fetch("http://localhost:5000/api/products?limit=1&page=1");
  const products = await productsRes.json();
  const first = products?.data?.[0];
  if (!first?.id) throw new Error("No products returned from /api/products");

  const checkoutRes = await fetch("http://localhost:5000/api/payments/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "buyer@example.com",
      items: [{ id: first.id, quantity: 1 }],
    }),
  });
  const data = await checkoutRes.json();
  console.log("status:", checkoutRes.status);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

