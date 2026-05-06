async function main() {
  const loginRes = await fetch("http://localhost:5000/api/merchants/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "seller@demo.com", password: "password123" }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) throw new Error(login.message || "Login failed");

  const res = await fetch("http://localhost:5000/api/merchants/me/dashboard", {
    headers: { Authorization: `Bearer ${login.token}` },
  });

  const data = await res.json();
  console.log("status:", res.status);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

