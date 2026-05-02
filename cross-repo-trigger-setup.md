# Cross-Repo Trigger Setup

Steps to run gRPCNode tests whenever `cpprepo1`'s main branch is pushed.

## Step 1 — Push gRPCNode changes

Commit and push the following files to your `gRPCNode` repo:

- `.github/workflows/test.yml` (updated — added `repository_dispatch` trigger)

## Step 2 — Create a Personal Access Token

1. Go to [github.com](https://github.com) → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a descriptive name, e.g. `grpcnode-dispatch`
4. Under **Select scopes**, check **`repo`**
5. Click **Generate token** and copy the token value immediately (it won't be shown again)

## Step 3 — Add the token as a secret in cpprepo1

1. Go to `https://github.com/erramidad123/cpprepo1`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set the name to `GRPCNODE_DISPATCH_TOKEN`
5. Paste the token value from Step 2
6. Click **Add secret**

## Step 4 — Add the dispatch workflow to cpprepo1

Copy the file `.github/workflows/notify-grpcnode.yml` from this repo into `cpprepo1` at the same path:

```
cpprepo1/
└── .github/
    └── workflows/
        └── notify-grpcnode.yml   ← add this file
```

Then commit and push it to `cpprepo1`'s main branch.

## Step 5 — Verify

1. Make any commit and push to `cpprepo1`'s `main` branch
2. Go to your `gRPCNode` repo → **Actions** tab
3. You should see a new **Run Tests** workflow run triggered by `repository_dispatch`
