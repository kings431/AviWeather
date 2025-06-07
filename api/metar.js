import axios from 'axios';
import { z } from 'zod';

const querySchema = z.object({
  icao: z.string().length(4),
  metar_choice: z.string().optional(),
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const { icao, metar_choice = '6' } = result.data;
  try {
    const url = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&alpha=metar&metar_choice=${metar_choice}&_=${Date.now()}`;
    const response = await axios.get(url, { timeout: 5000 });
    res.json({ metars: response.data.data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch METARs', details: err instanceof Error ? err.message : String(err) });
  }
} 