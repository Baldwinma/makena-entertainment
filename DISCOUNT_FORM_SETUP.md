# Discount Form - Google Sheets Setup Instructions

## Overview
Your discount form is now live on the website! Users can fill it out and receive a discount code instantly. To store the form data in Google Sheets, follow these steps:

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Makena Discount Form Submissions"
4. In the first row, add these headers:
   - A1: `First Name`
   - B1: `Last Name`
   - C1: `Email`
   - D1: `Phone Number`
   - E1: `Timestamp`

## Step 2: Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any code in the editor
3. Copy and paste the code below:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Append row with form data
    sheet.appendRow([
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      data.timestamp
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'error': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click the **Save** icon (💾)
5. Name your project "Makena Discount Form Handler"

## Step 3: Deploy as Web App

1. Click **Deploy > New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Fill in the details:
   - Description: "Makena Discount Form"
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** (if you see a warning)
9. Click **Go to [Project Name] (unsafe)**
10. Click **Allow**
11. **IMPORTANT**: Copy the Web App URL that appears
    - It will look like: `https://script.google.com/macros/s/YOUR_ID_HERE/exec`

## Step 4: Update Your Website Code

1. Open `script.js` file
2. Find this line (around line 490):
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual URL (keep the quotes)
4. Find this commented code (around line 528):
   ```javascript
   /*
   const response = await fetch(GOOGLE_SCRIPT_URL, {
       method: 'POST',
       mode: 'no-cors',
       headers: {
           'Content-Type': 'application/json',
       },
       body: JSON.stringify(data)
   });
   */
   ```
5. **Uncomment it** by removing the `/*` and `*/`

## Step 5: Test the Form

1. Refresh your website
2. Fill out the discount form
3. Check your Google Sheet - you should see the submission!

## Privacy & GDPR Compliance

Since you're collecting personal data, make sure to:

1. **Add a Privacy Policy** to your website
2. **Add a checkbox** to the form for users to consent to data collection
3. State clearly how you'll use their data (e.g., "We'll use your email to send you the discount code and occasional event updates")
4. Give users the ability to unsubscribe

### Quick Privacy Checkbox Addition

Add this to both forms (after the phone field, before the submit button):

```html
<div class="form-group">
    <label class="checkbox-label">
        <input type="checkbox" name="consent" required>
        <span>I agree to receive the discount code and occasional updates about Makena events. You can unsubscribe anytime.</span>
    </label>
</div>
```

## Customizing the Discount Code

Currently, the discount code is "MAKENA10". To change it:

1. Update the code in your Eventbrite account
2. Change the code in the HTML:
   - Find `<span id="discountCodeText">MAKENA10</span>` (appears twice)
   - Replace `MAKENA10` with your new code

## Troubleshooting

### Form submissions not appearing in Google Sheet?
- Make sure you deployed the Apps Script as described in Step 3
- Check that the URL in `script.js` is correct
- Make sure you uncommented the fetch code

### Users not seeing the discount code?
- Check browser console for errors (F12 > Console tab)
- Make sure JavaScript is enabled

## Next Steps

Consider integrating with an email marketing service like:
- **Mailchimp** - For automated email campaigns
- **SendGrid** - For transactional emails
- **Brevo** (formerly Sendinblue) - All-in-one marketing platform

This would allow you to automatically email the discount code and send follow-up campaigns.

---

Need help? Check the browser console (F12) for any error messages.
