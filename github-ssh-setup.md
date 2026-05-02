# GitHub Authentication with SSH Key (Windows)

All commands below are for **PowerShell**.

## Step 1 — Check for an existing SSH key

```powershell
ls $env:USERPROFILE\.ssh
```

If you see `id_ed25519.pub` or `id_rsa.pub`, you already have a key — skip to Step 3.

## Step 2 — Generate a new SSH key

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

- When prompted for a file location, press **Enter** to accept the default
- Optionally set a passphrase for extra security

## Step 3 — Enable and start the SSH agent

```powershell
# Run PowerShell as Administrator first, then:
Set-Service -Name ssh-agent -StartupType Automatic
Start-Service ssh-agent

# Add your private key
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

## Step 4 — Copy your public key

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | clip
```

This copies the key to your clipboard.

## Step 5 — Add the public key to GitHub

1. Go to [github.com](https://github.com) → **Settings** → **SSH and GPG keys**
2. Click **New SSH key**
3. Give it a title (e.g. `My Laptop`)
4. Paste the public key into the **Key** field
5. Click **Add SSH key**

## Step 6 — Test the connection

```powershell
ssh -T git@github.com
```

Expected output:

```
Hi <your-username>! You've successfully authenticated, but GitHub does not provide shell access.
```

## Step 7 — Update your remote URL (if using HTTPS)

If your repo is currently using HTTPS, switch it to SSH:

```powershell
git remote set-url origin git@github.com:<your-username>/<your-repo>.git
```

Verify with:

```powershell
git remote -v
```

You should now be able to `git push` and `git pull` without entering a password.
