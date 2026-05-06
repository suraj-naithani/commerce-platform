async function main() {
  const res = await fetch("http://localhost:5000/api/merchants/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "seller@demo.com", password: "password123" }),
  });

  const text = await res.text();
  console.log("status:", res.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

