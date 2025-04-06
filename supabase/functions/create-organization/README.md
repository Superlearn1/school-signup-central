
# Create Organization Edge Function

This Supabase Edge Function handles the creation of a Clerk organization and returns its ID.

## Functionality

The function performs the following operations:
1. Creates a new Clerk organization with the provided name and school ID in metadata
2. Verifies the existence of the admin user in Clerk
3. Adds the specified admin user as an admin member of the organization
4. Includes a small delay between organization creation and member addition to ensure Clerk has processed the organization
5. Verifies that the admin was successfully added to the organization

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
  "message": "Organization created and admin user added successfully",
  "membershipStatus": "success"
}
```

If successful with a warning:

```json
{
  "id": "org_1234567890",
  "warning": "Organization created but admin user could not be added automatically. Will retry on next login.",
  "error": { ... error details ... }
}
```

## Error Handling

The function includes extensive error handling:
- Logs all steps for debugging
- Returns detailed error information
- Gracefully handles cases where organization creation succeeds but member addition fails
- Includes appropriate HTTP status codes for different error types

## CORS Configuration

This function includes proper CORS headers to allow cross-origin requests from the frontend application.
