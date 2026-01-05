import fetch from "node-fetch";

(async () => {
  try {
    const res = await fetch(
      "http://localhost:4000/notification/combined?limit=50",
      {
        headers: { "x-username": "admin", "x-role": "admin" },
      }
    );
    const text = await res.text();
    console.log("status", res.status);
    console.log(text);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
