
# Create Organization Edge Function

This Supabase Edge Function handles the creation of a Clerk organization and returns its ID.

## Deployment

1. Make sure you have the Supabase CLI installed and are logged in
2. Navigate to the project root
3. Deploy the edge function:

```bash
supabase functions deploy create-organization
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
  "name": "Organization Name",
  "schoolId": "school-uuid",
  "adminUserId": "clerk_user_id"
}
```

It returns a JSON response with:

```json
{
  "id": "org_1234567890",
  "message": "Organization created and admin user added successfully"
}
```

## Function Purpose

This edge function performs two operations:
1. It creates a new Clerk organization with the provided name
2. It adds the specified admin user as an admin member of the organization

This ensures that the admin user who creates the organization is automatically added as a member with admin privileges, which is required for inviting teachers and managing the organization.

## CORS Configuration

This function includes proper CORS headers to allow cross-origin requests from the frontend application.

