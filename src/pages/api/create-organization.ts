
import { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient } from '@clerk/nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, schoolId } = req.body;

    if (!name || !schoolId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create a new organization in Clerk
    const organization = await clerkClient.organizations.createOrganization({
      name,
      metadata: {
        schoolId,
      },
    });

    return res.status(200).json({ id: organization.id });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return res.status(500).json({ error: error.message || 'Failed to create organization' });
  }
}
