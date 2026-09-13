const { app, utilityProcess } = require("electron");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtime = path.join(root, ".next", "standalone");
let child;
let dataDir;

async function availablePort() {
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const address = reservation.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  if (!port) throw new Error("Could not reserve a standalone smoke-test port.");
  return port;
}

async function waitForResponse(url, options) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Standalone server did not respond: ${lastError?.message || "timeout"}`);
}

async function request(origin, pathname, options = {}) {
  const response = await waitForResponse(`${origin}${pathname}`, options);
  const state = await response.json().catch(() => ({}));
  return { response, state };
}

function jsonOptions(body, cookie) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

function sessionCookie(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

function localDateInMonth(monthOffset, day) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthOffset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(day).padStart(2, "0")}`;
}

function assert(condition, message, state, stderr) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(state)}\n${stderr}`);
}

async function stopChild() {
  if (!child) return;
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 2_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill();
  });
}

async function verify() {
  const entry = path.join(runtime, "server.js");
  if (!fs.existsSync(entry)) throw new Error(`Standalone server is missing: ${entry}`);
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "moneypot-standalone-"));
  const port = await availablePort();
  const origin = `http://localhost:${port}`;
  child = utilityProcess.fork(entry, [], {
    cwd: runtime,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      MONEYPOT_DATA_DIR: dataDir,
      MONEYPOT_ASSET_DIR: path.join(runtime, "public"),
      MONEYPOT_DESKTOP: "1",
      JWT_SECRET_KEY: "standalone-smoke-test-secret-standalone-smoke-test-secret",
    },
    serviceName: "MoneyPot standalone smoke test",
    stdio: "pipe",
  });
  let stderr = "";
  child.stderr?.on("data", data => { stderr += data.toString(); });

  const health = await request(origin, "/api/health/database");
  assert(health.response.ok && health.state.ok, "Fresh database health failed", health.state, stderr);

  const firstSignup = await request(origin, "/api/signup", jsonOptions({
    username: "PIN Profile", age: 30, email: "pin-profile@moneypot.local",
    password: "pin-profile-password", pin: "135790",
  }));
  assert(firstSignup.response.ok && firstSignup.state.success, "PIN account creation failed", firstSignup.state, stderr);

  const secondSignup = await request(origin, "/api/signup", jsonOptions({
    username: "Password Profile", age: 31, email: "password-profile@moneypot.local",
    password: "password-profile-password", pin: "",
  }));
  assert(secondSignup.response.ok && secondSignup.state.success, "Password-only account creation failed", secondSignup.state, stderr);

  const profiles = await request(origin, "/api/pin/profiles");
  assert(profiles.response.ok && profiles.state.profiles?.length === 2,
    "All local profiles should be available to the account chooser", profiles.state, stderr);
  assert(profiles.state.profiles.every(profile => !Object.hasOwn(profile, "mail") && profile.mail_hint),
    "The account chooser exposed an unmasked email", profiles.state, stderr);
  const firstProfile = profiles.state.profiles.find(profile => profile.pin_enabled);
  const passwordProfile = profiles.state.profiles.find(profile => !profile.pin_enabled);

  const wrongProfilePin = await request(origin, "/api/pin/login", jsonOptions({ userid: firstProfile.userid, pin: "000000" }));
  assert(wrongProfilePin.response.status === 401 && wrongProfilePin.state.remaining_attempts === 4,
    "Incorrect PIN did not decrement the persistent attempt counter", wrongProfilePin.state, stderr);

  const pinLogin = await request(origin, "/api/pin/login", jsonOptions({ userid: firstProfile.userid, pin: "135790" }));
  const pinCookie = sessionCookie(pinLogin.response);
  assert(pinLogin.response.ok && pinLogin.state.success && !pinLogin.state.token && pinCookie.startsWith("token="),
    "Correct PIN did not create a session", pinLogin.state, stderr);

  const resumedSession = await request(origin, "/api/session", {
    headers: { cookie: pinCookie },
  });
  assert(resumedSession.response.ok && resumedSession.state.authenticated,
    "PIN session cookie could not be restored", resumedSession.state, stderr);

  const passwordLogin = await request(origin, "/api/login", jsonOptions({
    userid: passwordProfile.userid, password: "password-profile-password",
  }));
  const passwordCookie = sessionCookie(passwordLogin.response);
  assert(passwordLogin.response.ok && !passwordLogin.state.token && passwordCookie.startsWith("token="),
    "Full password fallback failed", passwordLogin.state, stderr);

  const passwordPreferences = await request(origin, "/api/pin/preferences", {
    headers: { cookie: passwordCookie },
  });
  assert(passwordPreferences.response.ok && !passwordPreferences.state.security?.pin_enabled &&
    passwordPreferences.state.security?.pin_prompted,
    "Explicitly skipped PIN was not preserved", passwordPreferences.state, stderr);

  const savedOllamaPreferences = await request(origin, "/api/preferences", jsonOptions({
    ollama_url: "http://127.0.0.1:11434",
    ollama_model: "qwen2.5:7b",
  }, passwordCookie));
  assert(savedOllamaPreferences.response.ok &&
    savedOllamaPreferences.state.preferences?.ollama_model === "qwen2.5:7b",
  "Selected Ollama model was not saved to account preferences", savedOllamaPreferences.state, stderr);

  const reloginAfterOllamaSave = await request(origin, "/api/login", jsonOptions({
    username: "PASSWORD-PROFILE@MONEYPOT.LOCAL", password: "password-profile-password",
  }));
  const reloginCookie = sessionCookie(reloginAfterOllamaSave.response);
  const restoredWorkspace = await request(origin, "/api/bootstrap", {
    headers: { cookie: reloginCookie },
  });
  assert(restoredWorkspace.response.ok &&
    restoredWorkspace.state.preferences?.ollama_model === "qwen2.5:7b" &&
    restoredWorkspace.state.preferences?.ollama_url === "http://127.0.0.1:11434",
  "Selected Ollama model was not restored after relogin", restoredWorkspace.state, stderr);

  const bankOnlyUpdate = await request(origin, "/api/preferences", jsonOptions({
    banks: ["Primary"], default_bank: "Primary",
  }, reloginCookie));
  assert(bankOnlyUpdate.response.ok &&
    bankOnlyUpdate.state.preferences?.default_bank === "Primary" &&
    bankOnlyUpdate.state.preferences?.ollama_model === "qwen2.5:7b",
  "Saving bank preferences overwrote the selected Ollama model", bankOnlyUpdate.state, stderr);

  const trendRows = [
    { type: "Credit", category: "Salary", description: "Trend income", date: localDateInMonth(-1, 1), amount: 100000, bank_name: "Main" },
    { type: "Debit", category: "Food", description: "Trend expense", date: localDateInMonth(-1, 2), amount: 25000, bank_name: "Main" },
    { type: "Investment", category: "Investments", description: "Trend investment", date: localDateInMonth(-1, 3), amount: 10000, bank_name: "Main" },
  ];
  const insertTrendRows = await request(origin, "/api/bulktransaction", jsonOptions(
    { rows: trendRows }, passwordCookie
  ));
  assert(insertTrendRows.response.ok && insertTrendRows.state.inserted === trendRows.length,
    "Trend fixture transactions could not be inserted", insertTrendRows.state, stderr);

  const trendResponse = await request(origin, "/api/monthtrend?months=3", {
    headers: { cookie: passwordCookie },
  });
  const expectedMonth = localDateInMonth(-1, 1).slice(0, 7);
  const populatedTrend = trendResponse.state.trend?.find(row => row.month === expectedMonth);
  assert(trendResponse.response.ok && trendResponse.state.trend?.length === 3 &&
    populatedTrend?.income === 100000 && populatedTrend?.expenses === 25000 &&
    populatedTrend?.investment === 10000 &&
    trendResponse.state.catByMonth?.[expectedMonth]?.[0]?.category === "Food",
  "Packaged Trends API did not return the signed-in user's monthly totals", trendResponse.state, stderr);

  const enableSecondPin = await request(origin, "/api/pin/preferences", jsonOptions(
    { action: "set", pin: "246802" }, passwordCookie
  ));
  assert(enableSecondPin.response.ok && enableSecondPin.state.security?.pin_enabled,
    "Settings could not add a PIN", enableSecondPin.state, stderr);

  const twoProfiles = await request(origin, "/api/pin/profiles");
  assert(twoProfiles.response.ok && twoProfiles.state.profiles?.length === 2,
    "Multiple PIN profiles were not independently listed", twoProfiles.state, stderr);
  const secondProfile = twoProfiles.state.profiles.find(item => item.name === "Password Profile");
  assert(secondProfile, "The password profile was not present after enabling its PIN", twoProfiles.state, stderr);
  const secondPinLogin = await request(origin, "/api/pin/login", jsonOptions({ userid: secondProfile.userid, pin: "246802" }));
  assert(secondPinLogin.response.ok && !secondPinLogin.state.token && sessionCookie(secondPinLogin.response).startsWith("token="),
    "Second profile PIN did not unlock its own account", secondPinLogin.state, stderr);

  const disableSecondPin = await request(origin, "/api/pin/preferences", jsonOptions(
    { action: "disable" }, passwordCookie
  ));
  assert(disableSecondPin.response.ok && !disableSecondPin.state.security?.pin_enabled,
    "Settings could not disable a PIN", disableSecondPin.state, stderr);
  const oneProfileAgain = await request(origin, "/api/pin/profiles");
  const remainingPinProfile = oneProfileAgain.state.profiles?.find(profile => profile.pin_enabled);
  const disabledProfile = oneProfileAgain.state.profiles?.find(profile => profile.userid === secondProfile.userid);
  assert(oneProfileAgain.state.profiles?.length === 2 && remainingPinProfile?.userid === firstProfile.userid && disabledProfile && !disabledProfile.pin_enabled,
    "Disabling one PIN affected the wrong profile", oneProfileAgain.state, stderr);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failure = await request(origin, "/api/pin/login", jsonOptions({ userid: firstProfile.userid, pin: "111111" }));
    const expectedStatus = attempt < 5 ? 401 : 429;
    assert(failure.response.status === expectedStatus,
      `PIN lockout attempt ${attempt} returned the wrong status`, failure.state, stderr);
  }
  const lockedCorrectPin = await request(origin, "/api/pin/login", jsonOptions({ userid: firstProfile.userid, pin: "135790" }));
  assert(lockedCorrectPin.response.status === 429 && lockedCorrectPin.state.retry_after > 0,
    "PIN lockout was not enforced after five cumulative failures", lockedCorrectPin.state, stderr);
  const passwordDuringLock = await request(origin, "/api/login", jsonOptions({
    username: "pin-profile@moneypot.local", password: "pin-profile-password",
  }));
  assert(passwordDuringLock.response.ok && !passwordDuringLock.state.token &&
    sessionCookie(passwordDuringLock.response).startsWith("token="),
    "Password fallback was unavailable during PIN lockout", passwordDuringLock.state, stderr);

  const database = path.join(dataDir, "collection.db");
  assert(fs.existsSync(database) && fs.statSync(database).size > 0,
    "First launch did not create collection.db in the data directory", {}, stderr);
  console.log("Standalone runtime passed: fresh DB, authentication, persistent Ollama model, PIN settings, populated Trends data, lockout, and password fallback succeeded.");
}

app.whenReady()
  .then(verify)
  .then(async () => {
    await stopChild();
    fs.rmSync(dataDir, { recursive: true, force: true });
    app.exit(0);
  })
  .catch(async error => {
    console.error(error.stack || error);
    await stopChild();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
    app.exit(1);
  });
