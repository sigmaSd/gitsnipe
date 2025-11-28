# gitsnipe

Download **specific files or folders** from any Git repository — without cloning
the full repo.

Uses `git sparse-checkout` under the hood and works in **Node**, **Deno**, and
**Bun**.

---

## Usage

```sh
deno -A jsr:@sigmasd/gitsnipe <path1> <path2> <destination>
# or
npx xjsr @sigmasd/gitsnipe <path1> <path2> <destination>
# or
bunx --bun xjsr @sigmasd/gitsnipe <path1> <path2> <destination>
```
