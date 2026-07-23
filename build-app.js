const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = __dirname;
const dist = path.join(root, "dist");
const sourceDir = path.join(root, "src");
const staticFiles = ["index.html", "styles.css", "app-config.js", "app-config.example.js"];
const bundleParts = [
  "app.js.gz.b64.part-00",
  "app.js.gz.b64.part-01",
  "app.js.gz.b64.part-02",
  "app.js.gz.b64.part-03"
];

function patchAuthRedirect(source) {
  let patched = source;

  if (!patched.includes("function getAuthRedirectUrl()")) {
    patched = patched.replace(
      "const remoteMode = Boolean(supabaseClient);\n",
      `const remoteMode = Boolean(supabaseClient);

function getAuthRedirectUrl() {
  if (CONFIG.authRedirectUrl) return CONFIG.authRedirectUrl;
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return \`${window.location.origin}${window.location.pathname}\`;
  }
  return undefined;
}
`
    );
  }

  if (!patched.includes("emailRedirectTo: getAuthRedirectUrl()")) {
    patched = patched.replace(
      "options: { data: { name: String(data.name || \"\").trim() } }",
      `options: {
          data: { name: String(data.name || "").trim() },
          emailRedirectTo: getAuthRedirectUrl()
        }`
    );
  }

  return patched;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

const encodedBundle = bundleParts
  .map((file) => fs.readFileSync(path.join(sourceDir, file), "utf8").trim())
  .join("");
const appSource = zlib.gunzipSync(Buffer.from(encodedBundle, "base64")).toString("utf8");
const patchedAppSource = patchAuthRedirect(appSource);
fs.writeFileSync(path.join(dist, "app.js"), patchedAppSource);

console.log(`Built dist with app.js (${patchedAppSource.length} bytes).`);
