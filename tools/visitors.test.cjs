const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const source = fs.readFileSync(path.join(__dirname, "../visitors.js"), "utf8");

async function runCounter(options = {}) {
  const outputs = [{ textContent: "", title: "" }, { textContent: "", title: "" }];
  const storage = new Map(options.cache === undefined ? [] : [["utsav-total-visits", String(options.cache)]]);
  let reads = 0, writes = 0;
  const collection = {
    get: async () => {
      reads++;
      if (options.readFails) throw new Error("Read denied");
      return { size: reads === 1 ? 137 : 138 };
    },
    doc: () => ({ set: async () => { writes++; if (options.writeFails) throw new Error("Write denied"); } }),
  };
  const app = { firestore: () => ({ collection: (name) => { assert.equal(name, "visitors"); return collection; } }) };
  const firebase = { apps: [app], app: () => app, firestore: () => {} };
  const context = vm.createContext({
    window: { firebase: options.sdkFails ? undefined : firebase },
    document: {
      querySelectorAll: () => outputs, createElement: () => ({}),
      head: { appendChild: (script) => script.onerror() },
    },
    localStorage: {
      getItem: (key) => { if (options.storageFails) throw new Error("Storage denied"); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (options.storageFails) throw new Error("Storage denied"); storage.set(key, value); },
    },
    navigator: { onLine: options.online !== false },
    location: { protocol: options.file ? "file:" : "https:" },
    fetch: async () => {
      assert.ok(reads >= 1, "historical count is read before looking up an IP");
      if (options.ipFails) throw new Error("IP lookup blocked");
      return { ok: true, json: async () => ({ ip: "203.0.113.10" }) };
    },
    setTimeout, clearTimeout, AbortSignal,
  });
  vm.runInContext(source, context);
  for (let turn = 0; turn < 8; turn++) await new Promise(setImmediate);
  return { outputs, storage, reads, writes };
}
test("main and footer show the shared historical count and refresh after registration", async () => {
  const result = await runCounter();
  assert.ok(result.outputs.every(output => output.textContent === "138"));
  assert.equal(result.storage.get("utsav-total-visits"), "138");
  assert.equal(result.writes, 1);
});
test("an IP lookup failure preserves the readable historical total", async () => {
  const result = await runCounter({ ipFails: true });
  assert.ok(result.outputs.every(output => output.textContent === "137"));
  assert.equal(result.writes, 0);
});
test("a visitor write failure preserves the readable historical total", async () => {
  const result = await runCounter({ writeFails: true });
  assert.ok(result.outputs.every(output => output.textContent === "137"));
});
test("offline visitors see the last recorded total without a network request", async () => {
  const result = await runCounter({ online: false, cache: 1234 });
  assert.ok(result.outputs.every(output => output.textContent === "1,234" && output.title === "Last recorded total visits"));
  assert.equal(result.reads, 0);
});
test("Firebase failure retains the cached total and handles a first visit without a fabricated number", async () => {
  const cached = await runCounter({ readFails: true, cache: 100 });
  assert.ok(cached.outputs.every(output => output.textContent === "100"));
  const first = await runCounter({ sdkFails: true });
  assert.ok(first.outputs.every(output => output.textContent === "Unavailable"));
});
test("blocked browser storage does not prevent live totals from loading", async () => {
  const result = await runCounter({ storageFails: true, ipFails: true });
  assert.ok(result.outputs.every(output => output.textContent === "137"));
});
test("the archive freezes original code, festival dates, and binary assets", () => {
  const root = path.resolve(__dirname, "..");
  const commit = fs.readFileSync(path.join(root, "archive/README.md"), "utf8").match(/[0-9a-f]{40}/)[0];
  for (const filename of ["script.js","nepali_holidays.csv","Group 41.png","favi.png"]) {
    const original = execFileSync("git", ["show", commit + ":" + filename], { cwd: root });
    assert.deepEqual(fs.readFileSync(path.join(root, "archive", filename)), original);
  }
  const html = fs.readFileSync(path.join(root, "archive/index.html"), "utf8");
  assert.match(html, /Archived original site/);
  assert.match(html, /href="\.\.\/index.html"/);
  assert.match(html, /background-color: #c51c1c/);
  const current = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(current, /href="archive\/index.html" id="archive-link">Archived<\/a>/);
  assert.equal((current.match(/id="totalVisits"/g) || []).length, 1);
});

