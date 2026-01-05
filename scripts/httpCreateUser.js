async function run() {
  const username = process.argv[2] || "multi_beban_test2";
  const bebanArg = process.argv[3] || "BJR-MEDIA,BJR-NET,BNT-MEDIA,BNT-NET";
  const bebanArray = bebanArg.includes(",")
    ? bebanArg.split(",").map((s) => s.trim())
    : [bebanArg.trim()];
  const payload = {
    username,
    password: "test1234",
    role: "user",
    beban: bebanArray,
  };
  try {
    const res = await fetch("http://localhost:4000/user/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-username": "admin",
        "x-role": "admin",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log("status", res.status);
    try {
      console.log("response json:", JSON.parse(text));
    } catch (e) {
      console.log("response text:", text);
    }
  } catch (err) {
    console.error("request error", err);
    process.exit(1);
  }
}
run();
