# profile-parser

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## GitHub parser token

Set `GITHUB_TOKEN` in `.env` to a fine-grained personal access token used only
to avoid GitHub's unauthenticated API rate limit. DevMatch parses public
profiles only; do not grant repository, organization, or account permissions.
Fine-grained tokens retain read-only access to public repositories without
granting access to private repositories.

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
