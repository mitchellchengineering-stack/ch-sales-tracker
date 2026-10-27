# CH Engineering Sales Tracker

A phone-friendly sales tracker for CH Engineering. Every contact, call and photo is saved to **your Google Sheet**, the app is hosted free on **GitHub Pages**, and the team gets **weekly follow-up emails** automatically.

Setup takes about 15–20 minutes and needs no coding. You'll do it once.

---

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The app itself |
| `sw.js`, `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | Let the app install on phones and work offline |
| `google-apps-script/Code.gs` | The "engine" that lives inside your Google Sheet (saving, emails, photos, map lookups) |
| `README.md` | This guide |

> **Try it first:** open `index.html` in a browser. Until it's connected to your Sheet it runs in **demo mode** with sample contacts, so you can click around safely.

---

## Part 1: Set up the Google Sheet (about 8 minutes)

1. Sign in to the **Gmail account that should own the data**, go to [sheets.google.com](https://sheets.google.com) and create a **blank spreadsheet**. Name it `CH Sales Tracker`.
2. In the menu, click **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete the little bit of code that's already there. Open `google-apps-script/Code.gs` from this folder, copy **everything**, and paste it in. Click the 💾 **Save** icon. (You can rename the project at the top to `CH Sales Tracker`.)
4. In the toolbar, pick **`setup`** from the function dropdown, then click **▶ Run**.
   - Google will ask for permission. Click **Review permissions**, choose your account.
   - You'll see "Google hasn't verified this app". That's normal for your own script. Click **Advanced → Go to CH Sales Tracker (unsafe) → Allow**.
   - When it finishes, go back to your Sheet. You'll now have tabs called **Contacts, Activity, Photos, Team, Settings, Email Templates** and **Cheat Sheet**.
5. Fill in the **Team** tab: one row per person, with their name and email. `Active` and `Weekly Email` should say `Yes`.
6. Fill in the **Settings** tab. The important ones:
   - **Team Passcode**: change `changeme` to something only your team knows.
   - **Manager Emails**: who gets the weekly team summary and the monthly report (separate several with commas).
   - **Google Review Link** and the **Brochure** links (optional, used in emails).
7. Back in Apps Script, click **Deploy → New deployment**.
   - Click the ⚙️ gear next to "Select type" and choose **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - Click **Deploy**, then **copy the Web app URL** (it ends in `/exec`). You'll need it in Part 2.

> "Anyone" just means the app can reach the Sheet from any phone. Nobody can read or change anything without the team passcode.

---

## Part 2: Put the app on GitHub (about 7 minutes)

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Click **+ → New repository**. Name it `ch-sales-tracker`, choose **Public**, and click **Create repository**.
   - Public is required for free hosting. Only the app's code is public; **your customer data stays in your Google Sheet**, never on GitHub.
3. Click **uploading an existing file**, drag in **all the files from this folder** (including the `google-apps-script` folder), and click **Commit changes**.
4. Click `index.html`, then the ✏️ **pencil** (Edit). Near the top you'll see:
   ```js
   SCRIPT_URL: '',
   ```
   Paste your Web app URL between the quotes, e.g. `SCRIPT_URL: 'https://script.google.com/macros/s/AKfy.../exec',` then click **Commit changes**.
5. Go to **Settings → Pages**. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, and click **Save**.
6. Wait a minute or two and refresh. Your app link appears at the top, something like `https://yourname.github.io/ch-sales-tracker/`.
7. Copy that link into the **App Link** row of the Settings tab in your Sheet (so the weekly emails have an "Open the Sales Tracker" button).

---

## Part 3: Get it on everyone's phone

1. Open the app link on the phone.
2. Enter the team passcode, then tap your name.
3. Add it to the home screen so it opens like a normal app:
   - **iPhone:** in Safari, tap **Share → Add to Home Screen**.
   - **Android:** in Chrome, tap **⋮ → Add to Home screen** (or **Install app**).

---

## Part 4: Check the emails work

In Apps Script, pick **`testWeeklyEmails`** from the function dropdown and click **▶ Run**. Anyone with follow-ups due (and the managers) will get the email straight away. You can do the same with **`testMonthlySummary`**.

After that it runs on its own:
- **Every Monday at 8am (NZ time):** each person gets *their own* overdue and upcoming follow-ups; managers get the whole team's list plus weekly numbers.
- **On the 1st of each month:** managers get a monthly report (new leads, what people were interested in, where leads came from, why people said no, jobs won, most active person).
- **Christmas shutdown:** weekly emails pause between the Shutdown Start and End dates in Settings, and follow-ups automatically skip that period.

---

## How the app works

**Follow-up colours.** Every company has a coloured stripe so you can see at a glance who needs attention:
🔴 Overdue · 🟡 Due today · 🟠 Due this week · 🟢 Later · ⚪ No follow-up needed

**Automatic follow-up dates.** Set from the status, and you can always change them:
- Interested / Maybe: 7 days
- Call back later: 2 working days
- Left voicemail / No answer: 2 working days
- Quote sent: 5 working days
- Not interested or Lost: revisit in 6 months
- Won: ask for a Google review after 30 days

Weekends and the Christmas shutdown are skipped automatically. All of these numbers can be changed in the Settings tab.

**Interested in.** Tap a product once for *interested* (✓), twice for *maybe* (?), and a third time to clear it. A company interested in frames and doors shows up in the Steel Framing tab, the Pre-hung Doors tab, and the Frames + Doors tab.

**Logging a call.** Tap the phone button to call. When you come back to the app it asks "How did it go?" so you can log it while it's fresh.

**Follow-up emails to clients.** "Email follow-up" opens a ready-written email in your phone's email app, so it comes from you and you can check it before sending. The wording mentions the products they were interested in.

**Works offline.** If you lose signal, everything you enter is saved on the phone and syncs to the Sheet once you're back in coverage. The button at the top shows how many changes are waiting.

---

## Changing things later

| To change… | Do this |
|---|---|
| Email wording | Edit the **Email Templates** tab. You can use `{{first_name}}`, `{{contact_name}}`, `{{company}}`, `{{products}}`, `{{product_paragraphs}}`, `{{sender}}`, `{{company_name}}`, `{{review_link}}` and (in product rows) `{{brochure}}`. |
| Cheat sheet answers | Edit the **Cheat Sheet** tab. |
| Team members | Edit the **Team** tab. Set `Active` to `No` for someone who has left, and **change the passcode** too. |
| Weekly email day or time | Change it in **Settings**, then in Apps Script run **`installTriggers`** once. |
| Regions list, follow-up timings, shutdown dates | Edit the **Settings** tab. The app picks up changes next time it's opened. |
| `Code.gs` (if you get an updated version) | Paste it in, save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. This keeps the same URL. |
| `index.html` (if you get an updated version) | Upload it to GitHub (keep your `SCRIPT_URL` line), and change `ch-sales-v1` to `ch-sales-v2` in `sw.js` so phones fetch the new version. |

> Please don't rename the column headings in the Contacts, Activity or Photos tabs; the app uses them to find things. You can add your own extra columns at the end.

---

## Good to know

- **Passcode security:** the passcode is a simple shared lock, suitable for a small team. Change it if a phone is lost or someone leaves.
- **Photos** are saved to a Google Drive folder called *CH Sales Tracker Photos*, shared as "anyone with the link can view" so the whole team can see them in the app.
- **Email rules:** NZ's Unsolicited Electronic Messages Act generally requires consent and an easy way to opt out for marketing emails. That's why the app has a "Happy to receive emails" tick box, and the default email ends with an opt-out line. If you're unsure about your situation, it's worth checking with an adviser.
- **Limits:** a personal Gmail can send about 100 emails a day from Apps Script, which is far more than the weekly reminders need. Map lookups also have a generous daily limit.
- **Backups:** your Google Sheet is the backup. You can also download a CSV from **More → Export contacts**, or use **File → Download** in Google Sheets.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Couldn't reach the Google Sheet" | Check the `SCRIPT_URL` in `index.html` ends in `/exec`, and that the deployment's access is set to **Anyone**. |
| "That passcode didn't match" | Check the **Team Passcode** in the Settings tab (no extra spaces). |
| A new team member isn't in the list | Add them to the **Team** tab, then on their phone use **More → Switch person**. |
| Changes to `Code.gs` aren't working | You need to deploy a **new version** (see "Changing things later"). |
| A company isn't on the map | Add an address (a town name is enough) and save. The location is looked up when it syncs. |
| No weekly emails | Make sure each person has an email in the Team tab with `Weekly Email` set to `Yes`, and run `installTriggers` once. |
