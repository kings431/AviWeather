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
    const url = `https://aviationweather.gov/cgi-bin/data/metar.php?ids=${icao}&format=raw`;
    const response = await axios.get(url, { timeout: 5000 });
    res.json({ data: response.data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch METAR', details: err instanceof Error ? err.message : String(err) });
  }
} 