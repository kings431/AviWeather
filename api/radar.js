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
    const url = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&image=RADAR`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (!response.data?.data || !Array.isArray(response.data.data)) {
      return res.status(502).json({ error: 'Invalid response from NavCanada API' });
    }

    const radarData = response.data.data.find(
      (d) => d.location && d.location.includes('RADAR')
    );

    if (!radarData?.text) {
      return res.status(404).json({ error: 'No radar data found for this station' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(radarData.text);
    } catch (e) {
      return res.status(502).json({ error: 'Malformed radar data from NavCanada' });
    }

    const frames = parsedData.frame_lists || [];
    res.json({ frames });
  } catch (err) {
    console.error('Radar fetch error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch radar data', 
      details: err instanceof Error ? err.message : String(err) 
    });
  }
} 