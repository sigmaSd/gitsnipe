import { basename, dirname, join } from "node:path";
import { cp, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { tmpdir } from "node:os";

/**
 * Parses a GitHub URL to extract the repository URL, branch, and internal path.
 * Supports tree and blob URLs.
 * @param url The GitHub URL to parse.
 * @returns An object containing the repository URL, branch, and path, or null if the URL is invalid.
 */
export function parseGithubUrl(url: string): {
  repoUrl: string;
  branch: string;
  path: string;
} | null {
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

/**
 * Usage information for the gitsnipe CLI.
 */
export const usage: string = `Usage: gitsnipe <github_url> [dest]
       gitsnipe <repo> <path1> <path2> ... <dest>

Example:
  gitsnipe https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-agenda
  gitsnipe https://github.com/googleworkspace/cli skills/gws-calendar-agenda .`;

/**
 * Configuration for the sparse checkout process.
 */
export interface Config {
  /** The URL of the GitHub repository. */
  repoUrl: string;
  /** The branch to clone (optional). */
  branch?: string;
  /** The paths within the repository to include in the sparse checkout. */
  sparsePaths: string[];
  /** The destination directory for the downloaded files. */
  dest: string;
}

/**
 * Resolves the configuration from the provided command-line arguments.
 * @param args The command-line arguments.
 * @returns The resolved configuration or null if the arguments are invalid.
 */
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

function git(args: string[]) {
  const { status } = spawnSync("git", args, { stdio: "inherit" });
  if (status !== 0) {
    throw new Error(`Git command failed with exit code ${status}`);
  }
}

async function run() {
  const config = resolveConfig(process.argv.slice(2));
  if (!config) {
    console.error(usage);
    process.exit(1);
  }

  const { repoUrl, branch, sparsePaths, dest } = config;

  const tmp = await mkdtemp(join(tmpdir(), "gitsnipe-"));
  const repoDir = join(tmp, "repo");

  try {
    console.log("→ Creating sparse checkout...");
    const branchArgs = branch ? ["-b", branch] : [];
    git([
      "clone",
      "--depth=1",
      "--filter=tree:0",
      "--no-checkout",
      ...branchArgs,
      repoUrl,
      repoDir,
    ]);

    console.log("→ Configuring sparse paths:", sparsePaths);

    git(["-C", repoDir, "sparse-checkout", "init", "--cone"]);
    git(["-C", repoDir, "sparse-checkout", "set", ...sparsePaths]);
    git(["-C", repoDir, "checkout"]);

    console.log("→ Copying...");
    await mkdir(dest, { recursive: true });

    for (const p of sparsePaths) {
      const src = join(repoDir, p);
      const dst = join(dest, basename(p));

      try {
        await stat(src);
      } catch {
        throw new Error(`Path not found in repository: ${p}`);
      }

      await mkdir(dirname(dst), { recursive: true });
      await cp(src, dst, { recursive: true });
    }

    console.log("✔ Done:", dest);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`\n❌ Error: ${e.message}`);
    } else {
      console.error(`\n❌ Error: ${e}`);
    }
    process.exit(1);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  await run();
}
