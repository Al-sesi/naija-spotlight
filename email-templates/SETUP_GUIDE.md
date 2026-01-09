# NAIJALIFT Email System Setup Guide

Since your application uses Supabase's built-in authentication, the email templates must be configured directly in your Supabase Project Dashboard.

## 1. Access Email Settings
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (**vdliauwtxklhlkltqqua**).
3. Navigate to **Authentication** > **Email Templates**.

## 2. Update Sender Identity
In the **Email Settings** (or SMTP Settings) section:
- **Sender Name:** Change to `NAIJALIFT`
- **Sender Email:** Change to `hello@naijalift.vercel.app` (or your verified custom domain email).

> **Note:** To use a custom domain email like `hello@naijalift.vercel.app`, you must configure **Custom SMTP** in Supabase (Settings > Auth > SMTP Settings) using a provider like Resend, SendGrid, or AWS SES. Otherwise, emails will come from `noreply@mail.app.supabase.io` (and might have rate limits).

## 3. Apply the New HTML Template
1. Click on **Confirm Signup** (Verification Email).
2. **Subject:** Set to `Welcome to NAIJALIFT! Please Verify Your Email`
3. **Message Body:**
   - Copy the HTML code from the file `email-templates/verification_email.html` in your project.
   - Paste it into the "Message Body" editor in Supabase.
   - **IMPORTANT:** Replace `[LOGO_URL]` in the HTML with a direct link to your logo (e.g., upload your logo to Supabase Storage and get the public URL).

## 4. Branding Checklist
- [ ] **Logo:** Ensure you have a valid URL for your logo image.
- [ ] **Color:** The template uses `#008751` (Nigerian Green).
- [ ] **Font:** The template requests 'Inter' or 'Helvetica'.

## 5. Other Templates (Optional)
You should apply a similar design to other templates:
- **Invite User**
- **Magic Link** (Use `{{ .Token }}` or `{{ .ConfirmationURL }}` as needed)
- **Reset Password**

You can reuse the same HTML structure from `verification_email.html` and just change the message text and button link variable.
