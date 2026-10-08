const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = __dirname;
const dist = path.join(root, "dist");
const sourceDir = path.join(root, "src");
const staticFiles = ["index.html", "styles.css", "app-config.js", "app-config.example.js"];

function patchAuthRedirect(source) {
  let patched = source;

  if (!patched.includes("function getAuthRedirectUrl()")) {
    patched = patched.replace(
      "const remoteMode = Boolean(supabaseClient);\n",
      `const remoteMode = Boolean(supabaseClient);

function getAuthRedirectUrl() {
  if (CONFIG.authRedirectUrl) return CONFIG.authRedirectUrl;
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return \`\${window.location.origin}\${window.location.pathname}\`;
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

function readAppSource() {
  const appPath = path.join(root, "app.js");
  if (fs.existsSync(appPath)) {
    return fs.readFileSync(appPath, "utf8");
  }

  const bundleParts = fs.readdirSync(sourceDir)
    .filter((file) => file.startsWith("app.js.gz.b64.part-"))
    .sort();
  if (!bundleParts.length) {
    throw new Error("No app.js or compressed app bundle parts were found.");
  }

  const encodedBundle = bundleParts
    .map((file) => fs.readFileSync(path.join(sourceDir, file), "utf8").trim())
    .join("");
  return zlib.gunzipSync(Buffer.from(encodedBundle, "base64")).toString("utf8");
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

const assetsDir = path.join(root, "assets");
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(dist, "assets"), { recursive: true });
}

const appSource = readAppSource();
const patchedAppSource = patchAuthRedirect(appSource);
fs.writeFileSync(path.join(dist, "app.js"), patchedAppSource);

console.log(`Built dist with app.js (${patchedAppSource.length} bytes).`);
