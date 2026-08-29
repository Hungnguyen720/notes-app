import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const staticFiles = ["index.html", "styles.css", "script.js"];

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  staticFiles.map((fileName) =>
    copyFile(`${projectDirectory}${fileName}`, `${outputDirectory}${fileName}`),
  ),
);

console.log(`Built ${staticFiles.length} static files in dist/.`);
