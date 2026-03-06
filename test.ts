import { assertEquals } from "jsr:@std/assert@1";
import { parseGithubUrl, resolveConfig } from "./main.ts";

Deno.test("parseGithubUrl - tree URL", () => {
  const url =
    "https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-agenda";
  const result = parseGithubUrl(url);
  assertEquals(result, {
    repoUrl: "https://github.com/googleworkspace/cli",
    branch: "main",
    path: "skills/gws-calendar-agenda",
  });
});

Deno.test("parseGithubUrl - blob URL", () => {
  const url = "https://github.com/googleworkspace/cli/blob/v1.0.0/README.md";
  const result = parseGithubUrl(url);
  assertEquals(result, {
    repoUrl: "https://github.com/googleworkspace/cli",
    branch: "v1.0.0",
    path: "README.md",
  });
});

Deno.test("resolveConfig - single URL", () => {
  const args = ["https://github.com/owner/repo/tree/main/some/path"];
  const config = resolveConfig(args);
  assertEquals(config, {
    repoUrl: "https://github.com/owner/repo",
    branch: "main",
    sparsePaths: ["some/path"],
    dest: ".",
  });
});

Deno.test("resolveConfig - URL and dest", () => {
  const args = ["https://github.com/owner/repo/tree/main/some/path", "my-dest"];
  const config = resolveConfig(args);
  assertEquals(config, {
    repoUrl: "https://github.com/owner/repo",
    branch: "main",
    sparsePaths: ["some/path"],
    dest: "my-dest",
  });
});

Deno.test("resolveConfig - old format", () => {
  const args = ["https://github.com/owner/repo", "path1", "path2", "my-dest"];
  const config = resolveConfig(args);
  assertEquals(config, {
    repoUrl: "https://github.com/owner/repo",
    sparsePaths: ["path1", "path2"],
    dest: "my-dest",
  });
});

Deno.test("resolveConfig - invalid", () => {
  assertEquals(resolveConfig([]), null);
  assertEquals(resolveConfig(["only-one-arg-not-url"]), null);
});
