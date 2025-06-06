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
    const url = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&image=NOTAM`;
    const response = await axios.get(url, { timeout: 5000 });
    if (!response.data?.data || !Array.isArray(response.data.data)) {
      return res.status(502).json({ error: 'Invalid response from NavCanada API' });
    }
    const notams = (response.data.data || []).map((n, idx) => ({
      id: n.pk || idx,
      location: n.location,
      startValidity: n.startValidity,
      endValidity: n.endValidity,
      text: n.text,
    }));
    res.json(notams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NOTAMs', details: err instanceof Error ? err.message : String(err) });
  }
} 