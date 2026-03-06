import "jsr:@sigma/deno-compat@0.8.1/node";
import { $ } from "jsr:@david/dax@0.44.1";
import { basename, dirname, join } from "jsr:@std/path@1";

export function parseGithubUrl(
  url: string,
): { repoUrl: string; branch: string; path: string } | null {
  const match = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(tree|blob)\/([^/]+)\/(.*)$/,
  );
  if (match) {
    const [_, owner, repo, _type, branch, path] = match;
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      branch,
      path,
    };
  }
  return null;
}

export const usage: string = `Usage: gitsnipe <github_url> [dest]
       gitsnipe <repo> <path1> <path2> ... <dest>

Example:
  gitsnipe https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-agenda
  gitsnipe https://github.com/googleworkspace/cli skills/gws-calendar-agenda .`;

export interface Config {
  repoUrl: string;
  branch?: string;
  sparsePaths: string[];
  dest: string;
}

export function resolveConfig(args: string[]): Config | null {
  if (args.length === 0) {
    return null;
  }

  const firstArgParsed = parseGithubUrl(args[0]);

  if (firstArgParsed) {
    const repoUrl = firstArgParsed.repoUrl;
    const branch = firstArgParsed.branch;
    if (args.length === 1) {
      return {
        repoUrl,
        branch,
        sparsePaths: [firstArgParsed.path],
        dest: ".",
      };
    } else {
      return {
        repoUrl,
        branch,
        sparsePaths: [firstArgParsed.path, ...args.slice(1, -1)],
        dest: args[args.length - 1],
      };
    }
  } else {
    if (args.length < 3) {
      return null;
    }
    return {
      repoUrl: args[0],
      dest: args[args.length - 1],
      sparsePaths: args.slice(1, -1),
    };
  }
}

async function run() {
  const config = resolveConfig(Deno.args);
  if (!config) {
    console.error(usage);
    Deno.exit(1);
  }

  const { repoUrl, branch, sparsePaths, dest } = config;

  const tmp = await Deno.makeTempDir();
  const repoDir = join(tmp, "repo");

  console.log("→ Creating sparse checkout...");
  const branchFlag = branch ? ["-b", branch] : [];
  await $`git clone --depth=1 --filter=tree:0 --no-checkout ${branchFlag} ${repoUrl} ${repoDir}`;

  console.log("→ Configuring sparse paths:", sparsePaths);

  await $`git -C ${repoDir} sparse-checkout init --cone`;
  await $`git -C ${repoDir} sparse-checkout set ${sparsePaths}`;
  await $`git -C ${repoDir} checkout`;

  console.log("→ Copying...");
  await Deno.mkdir(dest, { recursive: true });

  for (const p of sparsePaths) {
    const src = join(repoDir, p);
    const dst = join(dest, basename(p));

    await Deno.mkdir(dirname(dst), { recursive: true });

    try {
      await Deno.copyFile(src, dst);
    } catch {
      await $`cp -R ${src} ${dst}`;
    }
  }

  console.log("✔ Done:", dest);
  await Deno.remove(tmp, { recursive: true });
}

if (import.meta.main) {
  await run();
}
