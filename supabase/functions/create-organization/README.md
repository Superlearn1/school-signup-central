
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
  "schoolId": "school-uuid"
}
```

It returns a JSON response with:

```json
{
  "id": "org_1234567890"
}
```

## CORS Configuration

This function includes proper CORS headers to allow cross-origin requests. The following headers are included:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, OPTIONS`

The function properly handles preflight OPTIONS requests as required by browsers.
