# Connecting the bot to your "AI Inbox" Google Sheet

You only do this **once**. It creates a "robot Google account" (called a *service
account*) that the script logs in as, so it can write to your sheet on a schedule
without you ever typing a password. Takes about 10 minutes.

Have your **AI Inbox** sheet open in one tab while you do this.

---

## Step 1 — Make a Google Cloud project (the robot's home)

1. Go to **https://console.cloud.google.com/**  (sign in with the Google account
   that owns the sheet).
2. At the top, click the project dropdown → **New Project**.
3. Name it `mh-benchmark-bot` → **Create**. Wait a few seconds, then make sure that
   project is selected in the top dropdown.

## Step 2 — Turn on the Sheets + Drive access

1. In the search bar at the top, type **"Google Sheets API"** → open it → **Enable**.
2. Search **"Google Drive API"** → open it → **Enable**.

## Step 3 — Create the robot account

1. Search **"Service Accounts"** (or left menu → *IAM & Admin → Service Accounts*).
2. Click **+ Create Service Account**.
3. Name: `inbox-writer` → **Create and Continue** → skip the optional steps →
   **Done**.
4. You'll see the new account in the list. **Copy its email** — it looks like
   `inbox-writer@mh-benchmark-bot.iam.gserviceaccount.com`. You need it in Step 5.

## Step 4 — Download the robot's key file

1. Click the robot account's email → **Keys** tab → **Add Key → Create new key**.
2. Choose **JSON** → **Create**. A `.json` file downloads.
3. **Rename** that file to **`service_account.json`** and move it into your project
   folder:
   `C:\Users\datvu\mental-health-benchmark-system\service_account.json`

   > This file is a password. It's already in `.gitignore`, so it will never be
   > uploaded to GitHub. Don't email it or paste it anywhere.

## Step 5 — Share the sheet with the robot

1. Open your **AI Inbox** Google Sheet.
2. Click **Share** (top right).
3. Paste the robot's email (from Step 3) → set it to **Editor** → **Send**.
   (Ignore any "outside your organization" warning — it's your own robot.)

## Step 6 — Tell the script where the sheet is

1. In your sheet's web address, copy the long code between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_CODE`**`/edit`
2. Open the project's **`.env`** file and add these two lines:

   ```
   GOOGLE_CREDS_FILE=service_account.json
   INBOX_SHEET_ID=PASTE_THE_LONG_CODE_HERE
   ```

---

## Step 7 — Test it

Open a terminal in the project folder and run:

```
python scripts/push_to_sheet.py check
```

- ✅ **"Connection test passed"** → you're done. Run without `check` to push papers.
- ❌ **"can't open the sheet"** → redo Step 5 (share with the exact robot email).
- ❌ **"key file not found"** → check the file is named exactly `service_account.json`
  in the project folder (Step 4).

Then, to send your extracted papers into the Inbox:

```
python scripts/push_to_sheet.py
```

It adds each new paper with **Status = New** and skips any already in the sheet.
