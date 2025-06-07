import axios from 'axios';
import { z } from 'zod';

const querySchema = z.object({
  icao: z.string().length(4),
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const { icao } = result.data;
  try {
    const url = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&alpha=notam&notam_choice=default&_=${Date.now()}`;
    const response = await axios.get(url, { timeout: 5000 });
    // Return the full response (meta and data) as received from NavCanada
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NOTAMs', details: err instanceof Error ? err.message : String(err) });
  }
}