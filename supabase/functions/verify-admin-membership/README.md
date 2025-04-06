
# Verify Admin Membership Edge Function

This Supabase Edge Function verifies that the current user is properly set up as an admin in the Clerk organization and fixes the membership if needed.

## Deployment

1. Make sure you have the Supabase CLI installed and are logged in
2. Navigate to the project root
3. Deploy the edge function:

```bash
supabase functions deploy verify-admin-membership
```

## Required Secrets

The following secrets must be set in your Supabase project:

- `CLERK_SECRET_KEY`: Your Clerk secret API key

To set these secrets:

```bash
supabase secrets set CLERK_SECRET_KEY=your_clerk_secret_key
```

## Function Usage

The function expects a POST request with a JSON body containing:

```json
{
  "organizationId": "clerk_organization_id"
}
```

It returns a JSON response with:

```json
{
  "success": true|false,
  "message": "Status message"
}
```

## Function Purpose

This edge function performs two main operations:
1. It checks if the current authenticated user is a member of the specified Clerk organization
2. If not, it adds the user as an admin to the organization

This helps fix cases where an organization was created but the admin user wasn't properly added as a member, which can prevent the admin from inviting teachers or performing other organization management tasks.

## CORS Configuration

This function includes proper CORS headers to allow cross-origin requests from the frontend application.
