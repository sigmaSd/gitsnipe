import "jsr:@sigma/deno-compat@0.8.1/node";
import { $ } from "jsr:@david/dax@0.44.1";
import { join } from "jsr:@std/path@1";

if (Deno.args.length < 3) {
  console.error("Usage: sparse.ts <repo> <path1> <path2> ... <dest>");
  Deno.exit(1);
}

const repoUrl = Deno.args[0];
const dest = Deno.args[Deno.args.length - 1];
const sparsePaths = Deno.args.slice(1, -1);

const tmp = await Deno.makeTempDir();
const repoDir = join(tmp, "repo");

console.log("→ Creating sparse checkout...");
await $`git clone --depth=1 --filter=tree:0 --no-checkout ${repoUrl} ${repoDir}`;

console.log("→ Configuring sparse paths:", sparsePaths);

// IMPORTANT: no multiline dax commands
await $`git -C ${repoDir} sparse-checkout init --cone`;
await $`git -C ${repoDir} sparse-checkout set ${sparsePaths}`;
await $`git -C ${repoDir} checkout`;

console.log("→ Copying...");
await Deno.mkdir(dest, { recursive: true });

for (const p of sparsePaths) {
  const src = join(repoDir, p);
  const dst = join(dest, p);

  try {
    await Deno.copyFile(src, dst);
  } catch {
    await $`cp -R ${src} ${dst}`;
  }
}

console.log("✔ Done:", dest);
await Deno.remove(tmp, { recursive: true });
