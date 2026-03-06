# gitsnipe

Download **specific files or folders** from any Git repository — without cloning
the full repo.

Uses `git sparse-checkout` under the hood and works in **Deno**, **Node**, and
**Bun**.

## Usage

You can use `gitsnipe` either by providing a full GitHub "tree" or "blob" URL,
or by explicitly specifying the repository, the paths you want, and the
destination.

### 1. From a GitHub URL

Perfect for quickly grabbing a folder or file you're currently browsing.

```sh
deno -A jsr:@sigmasd/gitsnipe <github_url> [dest]
```

**Example:**

```sh
deno -A jsr:@sigmasd/gitsnipe https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-agenda
```

### 2. Explicit Repository and Paths

Useful when you need multiple paths or want more control over the source and
destination.

```sh
deno -A jsr:@sigmasd/gitsnipe <repo_url> <path1> [path2...] <dest>
```

**Example:**

```sh
deno -A jsr:@sigmasd/gitsnipe https://github.com/googleworkspace/cli skills/gws-calendar-agenda .
```

---

## Installation / Run directly

### Deno

```sh
deno -A jsr:@sigmasd/gitsnipe <args>
```

### Node.js (via rjsr)

```sh
npx rjsr @sigmasd/gitsnipe <args>
```

### Bun (via rjsr)

```sh
bunx rjsr @sigmasd/gitsnipe <args>
```

---

## How it works

`gitsnipe` performs a shallow, sparse clone of the target repository, only
fetching the objects necessary for the requested paths. It then moves the files
to your destination and cleans up the temporary repository.
