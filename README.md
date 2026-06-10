# Job Application Email Tracker Todo Roadmap

This roadmap tracks the planned development of the Job Application Email Tracker app.

The current goal is to build a clean MVP that can connect to Gmail, find job-application-related emails, display them in a dashboard, and later classify them into useful statuses.

---

## Phase 1: Local MVP Foundation

Goal: Get the app working reliably on my local machine with my own Gmail account.

### Gmail Connection

- [ ] Confirm Google sign-in works locally
- [ ] Confirm Gmail readonly permission works
- [ ] Confirm Gmail API is enabled in Google Cloud
- [ ] Confirm app can fetch recent Gmail messages
- [ ] Confirm app extracts:
  - [ ] Subject
  - [ ] Sender email
  - [ ] Sender name
  - [ ] Snippet
  - [ ] Body text
  - [ ] Received date
  - [ ] Gmail message ID
  - [ ] Thread ID

### Baseline Email Filter

- [ ] Build a simple baseline filter for job-application-related emails
- [ ] Use simple phrase matching first, not AI
- [ ] Check subject, sender, snippet, and body text
- [ ] Prioritize recall so real application emails are not missed
- [ ] Do not save skipped/non-application emails
- [ ] Save only emails that pass the job application filter
- [ ] Add matched phrases and filter reason for debugging
- [ ] Add a debug preview mode that shows:
  - [ ] All previewed emails
  - [ ] Emails that would be saved
  - [ ] Emails that would be skipped
- [ ] Add a “No / Would Skip” debug filter to find false negatives
- [ ] Tune phrase list based on missed application emails
- [ ] Tune phrase list based on false positives

### Database Cleanup

- [ ] Add a development-only route or script to clear old app data
- [ ] Clear old noisy `JobEmail` records
- [ ] Clear old noisy `JobApplication` records
- [ ] Keep auth data so Google sign-in does not need to be redone
- [ ] Confirm dashboard is clean after clearing old data
- [ ] Re-sync Gmail using the simplified filter

### Dashboard MVP

- [ ] Display saved job application emails in the dashboard
- [ ] Show:
  - [ ] Subject
  - [ ] Sender
  - [ ] Received date
  - [ ] Snippet/body preview
  - [ ] Matched phrases
  - [ ] Filter reason
- [ ] Make sure dashboard only shows saved job application emails
- [ ] Add a Sync Gmail button
- [ ] Show sync summary:
  - [ ] Total fetched
  - [ ] Saved job application emails
  - [ ] Skipped emails
- [ ] Refresh dashboard after sync
- [ ] Do not require a manual browser refresh after sync

---

## Phase 2: Local MVP Classification

Goal: Once the filter is reliable, classify saved job application emails into useful statuses.

### Status Classification

- [ ] Add status field for each saved application email
- [ ] Use statuses:
  - [ ] `waiting`
  - [ ] `needs_action`
  - [ ] `rejected`
  - [ ] `unclassified`
- [ ] Start with simple rule-based status classification
- [ ] Classify only saved job application emails
- [ ] Do not classify skipped emails
- [ ] Add classification reason for debugging
- [ ] Make sure status is never blank
- [ ] Add manual override for status

### Dashboard Status Views

- [ ] Add summary cards:
  - [ ] Waiting
  - [ ] Needs Action
  - [ ] Rejected
  - [ ] Unclassified
- [ ] Add table filters:
  - [ ] All
  - [ ] Waiting
  - [ ] Needs Action
  - [ ] Rejected
  - [ ] Unclassified
- [ ] Make the filters client-side if data volume is small
- [ ] Later move filters to API/database query if needed

### Needs Action Tracking

- [ ] Identify emails that require action
- [ ] Add simple todo field
- [ ] Add todo display in dashboard
- [ ] Add todo completion checkbox
- [ ] Save completed todos in the database
- [ ] Add filter for applications with open todos
- [ ] Add optional due date if the email includes one

---

## Phase 3: AI-Assisted Classification

Goal: Use AI only after the app reliably filters job application emails.

### AI Classifier

- [ ] Add AI classifier for saved job application emails
- [ ] Do not send every inbox email to AI
- [ ] Only send emails that pass the baseline job application filter
- [ ] Return structured JSON:
  - [ ] Is job application email
  - [ ] Status
  - [ ] Company
  - [ ] Role
  - [ ] Todo
  - [ ] Due date
  - [ ] Confidence score
  - [ ] Reason
- [ ] Validate AI output before saving
- [ ] Add fallback to rule-based classification if AI fails
- [ ] Store classification source:
  - [ ] Rule
  - [ ] AI
  - [ ] Manual
- [ ] Let manual corrections override AI

### Company and Role Extraction

- [ ] Use AI to extract company and role
- [ ] Do not rely only on sender domain
- [ ] Extract company from subject/body when possible
- [ ] Extract role from subject/body when possible
- [ ] Use sender/domain only as fallback
- [ ] Allow manual correction of company
- [ ] Allow manual correction of role

---

## Phase 4: Local App Polish

Goal: Make the app comfortable to use locally before deployment.

### UI Improvements

- [ ] Improve dashboard layout
- [ ] Add loading states
- [ ] Add sync success/error messages
- [ ] Add empty states
- [ ] Add error states
- [ ] Add email preview panel
- [ ] Add manual edit controls
- [ ] Add delete/remove from dashboard option
- [ ] Add last synced timestamp

### Data Management

- [ ] Add ability to clear synced application data
- [ ] Add ability to re-sync Gmail
- [ ] Add ability to reclassify existing saved emails
- [ ] Add ability to mark an email as not a job application
- [ ] Add ability to manually add an application
- [ ] Add ability to manually archive/hide an application

### Reliability

- [ ] Make sync idempotent
- [ ] Do not create duplicate records for the same Gmail message
- [ ] Use Gmail message ID as unique key
- [ ] Update existing emails when sync runs again
- [ ] Handle expired access tokens
- [ ] Handle Gmail API errors gracefully
- [ ] Handle missing body text
- [ ] Handle HTML-only emails
- [ ] Handle weird sender formats

---

## Phase 5: Deployment for Personal Use

Goal: Deploy the app so I can use it outside localhost.

### Hosting

- [ ] Choose hosting platform, likely Vercel
- [ ] Add production environment variables
- [ ] Add production database connection string
- [ ] Deploy Next.js app
- [ ] Confirm Prisma works in production
- [ ] Confirm auth works in production
- [ ] Confirm Gmail sync works in production

### Google Cloud Production Setup

- [ ] Add production URL to Google OAuth JavaScript origins
- [ ] Add production callback URL to Google OAuth redirect URIs
- [ ] Confirm Gmail API is enabled
- [ ] Confirm OAuth consent screen is configured
- [ ] Keep app in testing mode if only using personally
- [ ] Add my Google account as a test user
- [ ] Verify production sign-in
- [ ] Verify production Gmail readonly access

### Security

- [ ] Make sure `.env.local` is not committed
- [ ] Make sure `.env` is not committed
- [ ] Rotate any secrets accidentally exposed
- [ ] Store only necessary email data
- [ ] Avoid logging full email bodies
- [ ] Avoid logging access tokens
- [ ] Avoid logging refresh tokens
- [ ] Restrict dev-only routes to development
- [ ] Remove or protect any cleanup/reset routes before production

---

## Phase 6: Production-Ready Personal App

Goal: Make the app stable, secure, and maintainable for real personal use.

### Auth and Permissions

- [ ] Use least-privilege Gmail scope
- [ ] Use Gmail readonly only
- [ ] Store tokens safely
- [ ] Handle token refresh
- [ ] Add disconnect Gmail option
- [ ] Add delete stored data option
- [ ] Add account deletion option if needed

### Database

- [ ] Review Prisma schema
- [ ] Add indexes for common queries
- [ ] Add user-specific filtering
- [ ] Make sure every application belongs to a user
- [ ] Make sure every email belongs to a user
- [ ] Make sure queries never leak data between users
- [ ] Add timestamps consistently
- [ ] Add unique constraints for Gmail message IDs

### Error Handling

- [ ] Add user-friendly Gmail sync errors
- [ ] Add handling for revoked Google access
- [ ] Add handling for expired sessions
- [ ] Add handling for database errors
- [ ] Add handling for AI API errors later
- [ ] Add basic logging without sensitive data

---

## Phase 7: Multi-User Support

Goal: Eventually allow other users to sign in and connect their own Gmail accounts.

### Multi-User Data Safety

- [ ] Ensure all records include `userId`
- [ ] Filter all dashboard queries by signed-in user
- [ ] Filter all sync queries by signed-in user
- [ ] Filter all todos by signed-in user
- [ ] Prevent users from accessing other users’ records
- [ ] Add tests for user data isolation

### Google OAuth Verification

- [ ] Review Google OAuth requirements for Gmail readonly scope
- [ ] Prepare privacy policy
- [ ] Prepare terms of service
- [ ] Prepare app homepage
- [ ] Prepare data deletion instructions
- [ ] Submit app for Google verification if needed
- [ ] Determine whether restricted Gmail scope security assessment is required

### User Controls

- [ ] Allow users to disconnect Gmail
- [ ] Allow users to delete all synced emails
- [ ] Allow users to delete their account
- [ ] Clearly explain what data is stored
- [ ] Clearly explain that Gmail readonly does not modify emails

---

## Phase 8: Analytics

Goal: Analyze job application outcomes and patterns.

### Basic Analytics

- [ ] Count total applications
- [ ] Count waiting applications
- [ ] Count needs-action applications
- [ ] Count rejected applications
- [ ] Count interviews
- [ ] Count assessments
- [ ] Count offers if added later
- [ ] Calculate rejection rate
- [ ] Calculate interview rate
- [ ] Calculate assessment rate
- [ ] Calculate response rate
- [ ] Calculate average time to response

### Time-Based Analytics

- [ ] Applications over time
- [ ] Responses over time
- [ ] Average days until rejection
- [ ] Average days until interview request
- [ ] Average days waiting
- [ ] Applications by week/month

### Company and Role Analytics

- [ ] Track company
- [ ] Track role
- [ ] Track industry
- [ ] Track company size
- [ ] Track location
- [ ] Track remote/hybrid/in-person
- [ ] Track source:
  - [ ] LinkedIn
  - [ ] ZipRecruiter
  - [ ] Company website
  - [ ] Referral
  - [ ] Other
- [ ] Analyze response rate by source
- [ ] Analyze response rate by industry
- [ ] Analyze response rate by role type
- [ ] Analyze response rate by company size
- [ ] Analyze interview rate by application source

### Future Advanced Analytics

- [ ] Add charts
- [ ] Add conversion funnel:
  - [ ] Applied
  - [ ] Assessment
  - [ ] Interview
  - [ ] Offer
  - [ ] Rejected
- [ ] Add company-size analysis
- [ ] Add industry analysis
- [ ] Add resume-version tracking
- [ ] Add cover-letter tracking
- [ ] Add application-source tracking
- [ ] Add notes field for manual observations
- [ ] Add export to CSV
- [ ] Add dashboard date filters

---

## Phase 9: Testing

Goal: Make the app less fragile as it grows.

### Local Tests

- [ ] Add unit tests for the baseline email filter
- [ ] Add test cases for real sample emails
- [ ] Add tests for false positives
- [ ] Add tests for false negatives
- [ ] Add tests for status classification
- [ ] Add tests for company extraction
- [ ] Add tests for role extraction
- [ ] Add tests for sync idempotency

### Integration Tests

- [ ] Test API route for applications
- [ ] Test Gmail sync route with mocked Gmail data
- [ ] Test auth-protected routes
- [ ] Test database writes
- [ ] Test dashboard fetch

### Manual Testing Checklist

- [ ] Sign in with Google
- [ ] Click Preview Recent Emails
- [ ] Review skipped emails
- [ ] Click Sync Gmail
- [ ] Confirm only application emails are saved
- [ ] Confirm dashboard updates
- [ ] Confirm no duplicate rows
- [ ] Confirm old data can be cleared
- [ ] Confirm filters work
- [ ] Confirm status labels are correct

---

## Phase 10: Documentation

Goal: Keep the project understandable.

### README

- [ ] Explain project purpose
- [ ] Explain tech stack
- [ ] Explain local setup
- [ ] Explain environment variables
- [ ] Explain Google Cloud setup
- [ ] Explain Prisma setup
- [ ] Explain how to run locally
- [ ] Explain how to clear local data
- [ ] Explain how to test Gmail sync
- [ ] Explain current limitations
- [ ] Keep todo roadmap updated

### Developer Notes

- [ ] Add `PROJECT_NOTES.md`
- [ ] Document current architecture decisions
- [ ] Document current simplified MVP goal
- [ ] Document what not to build yet
- [ ] Document future AI classification plan
- [ ] Document production concerns
- [ ] Document Google OAuth/Gmail API setup

---

## Current MVP Definition

The MVP is complete when:

- [ ] I can sign in with Google
- [ ] I can authorize Gmail readonly access
- [ ] I can click Sync Gmail
- [ ] The app fetches my recent Gmail messages
- [ ] The app filters out emails unrelated to actual job applications
- [ ] The app saves only job application emails
- [ ] The dashboard displays saved job application emails
- [ ] The app can classify saved emails as:
  - [ ] Waiting
  - [ ] Needs Action
  - [ ] Rejected
- [ ] I can filter the dashboard by status
- [ ] I can see which applications need action
- [ ] I can clear old synced data during development
- [ ] The app works locally without needing manual database edits
