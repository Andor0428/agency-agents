# Local setup (Mac)

## Node version — important

Use **Node 22 LTS**. Node 26 (Homebrew default) breaks `better-sqlite3` on the API.

```bash
# Install nvm if needed: https://github.com/nvm-sh/nvm
nvm install 22
nvm use 22
node -v   # should print v22.x.x
```

## Get the latest code (includes Google OAuth / M14)

```bash
cd ~/agency-agents
git fetch origin
git checkout cursor/m14-google-oauth-deploy-566a
```

## API

```bash
cd ~/agency-agents/stock-take-api
nvm use
cp .env.example .env
# Edit .env — add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET
npm install
npm run dev
```

## Mobile app

```bash
cd ~/agency-agents/stock-take-app
nvm use
cp .env.example .env
# Edit .env — add GOOGLE_OAUTH_CLIENT_ID (no secret on mobile)
npm install
npm start
```

## Common errors

| Error | Fix |
|-------|-----|
| `better-sqlite3` compile failed | `nvm use 22`, delete `node_modules`, `npm install` again |
| `tsx: command not found` | `npm install` failed — fix Node version first |
| `cd: no such file or directory: stock-take-api` | `cd ~/agency-agents/stock-take-api` |
| `package.json ENOENT` in `~` | You're in home dir — cd into project folder first |
| `cp: .env.example: No such file` | Wrong directory — must be inside `stock-take-app` or `stock-take-api` |
