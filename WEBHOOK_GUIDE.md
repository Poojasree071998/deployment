# 🚀 GitHub Webhook Setup Guide

This guide will help you connect your local Mini PaaS to GitHub so that every `git push` automatically triggers a new deployment.

## Step 1: Expose your Local Server
Since GitHub cannot "see" `localhost:5000`, you need to create a public tunnel.

1.  **Install ngrok** (if you don't have it): `npm install -g ngrok`
2.  **Start a tunnel**:
    ```bash
    ngrok http 5000
    ```
3.  **Copy the Forwarding URL**: It will look like `https://a1b2-c3d4.ngrok-free.app`.

## Step 2: Configure GitHub
1.  Go to your repository on GitHub.
2.  Navigate to **Settings** > **Webhooks** > **Add webhook**.
3.  **Payload URL**: Paste your ngrok URL and add `/api/webhooks/github` at the end.
    *   Example: `https://a1b2-c3d4.ngrok-free.app/api/webhooks/github`
4.  **Content type**: Select `application/json`.
5.  **Secret**: (Optional) Enter a secret string (e.g., `my_super_secret`). 
    *   *If you do this, add `GITHUB_WEBHOOK_SECRET=my_super_secret` to your `.env` file.*
6.  **Which events?**: Select "Just the `push` event."
7.  **Active**: Ensure the checkbox is checked.
8.  Click **Add webhook**.

## Step 3: Test it!
1.  Make a small change to your code.
2.  `git add .`, `git commit -m "test webhook"`, and `git push`.
3.  Check your Mini PaaS terminal or Dashboard. You should see a new deployment start automatically!

---

## Troubleshooting
- **401 Unauthorized**: You provided a secret in GitHub but didn't set `GITHUB_WEBHOOK_SECRET` in your `.env` (or vice versa).
- **No matching project**: Ensure the "Git Repository URL" you entered in the Mini PaaS dashboard exactly matches the URL on GitHub.
- **ngrok expired**: Free ngrok URLs change every time you restart the command. You'll need to update the GitHub webhook URL if you restart ngrok.
