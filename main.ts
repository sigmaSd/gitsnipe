import { $ } from "jsr:@david/dax@0.42.0";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { join } from "jsr:@std/path@1/join";
import process from "node:process";

/**
 * gitsnipe — download specific files/folders from a Git repo via sparse checkout
 *
 * Usage:
 *   gitsnipe <repo_url> <path1> <path2> ... <destination>
 */

function printUsage() {
  console.log(`
Usage:
  gitsnipe <repo_url> <path1> <path2> ... <destination>

Example:
  gitsnipe https://github.com/denoland/deno .github tools ./sniped
`);
}

if (process.argv.length < 5) {
  printUsage();
  process.exit(1);
}

const repoUrl = process.argv[2];
const destination = process.argv[process.argv.length - 1];
const sparsePaths = process.argv.slice(3, -1);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitsnipe-"));
const repoDir = join(tempDir, "repo");

console.log("→ Creating sparse checkout…");
await $`git clone --depth 1 --filter=tree:0 --no-checkout ${repoUrl} ${repoDir}`;

console.log("→ Configuring sparse paths:", sparsePaths);
await $`git -C ${repoDir} sparse-checkout init --cone`;
await $`git -C ${repoDir} sparse-checkout set ${sparsePaths}`;

console.log("→ Checking out…");
await $`git -C ${repoDir} checkout`;

console.log("→ Copying files to:", destination);
fs.mkdirSync(destination, { recursive: true });

// Copy function that supports file or directory
function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);

  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return;
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  }
}

// Copy requested paths
for (const p of sparsePaths) {
  const src = path.join(repoDir, p);
  const dst = path.join(destination, p);
  copyRecursive(src, dst);
}

console.log("✔ Done! Sniped into:", destination);

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
