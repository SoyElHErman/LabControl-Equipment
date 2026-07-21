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
  "app.js.gz.b64.part-03",
  "app.js.gz.b64.part-04",
  "app.js.gz.b64.part-05",
  "app.js.gz.b64.part-06"
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

const encodedBundle = bundleParts
  .map((file) => fs.readFileSync(path.join(sourceDir, file), "utf8").trim())
  .join("");
const appSource = zlib.gunzipSync(Buffer.from(encodedBundle, "base64"));
fs.writeFileSync(path.join(dist, "app.js"), appSource);

console.log(`Built dist with app.js (${appSource.length} bytes).`);
