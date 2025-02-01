import { supabase } from '../../lib/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; error?: string }>
) {
  if (req.method === 'POST') {
    try {
      const { userId }: { userId: string } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'Invalid request data' });
      }

      // Update the user's `has_lifetime_access` field in Supabase
      const { error } = await supabase
        .from('users')
        .update({ has_lifetime_access: true })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user access:', error);
        return res.status(500).json({ success: false, error: 'Failed to update user access' });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ success: false, error: 'An unexpected error occurred' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}