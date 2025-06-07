import axios from 'axios';
import { z } from 'zod';

const querySchema = z.object({
  icao: z.string().length(4),
  type: z.enum(['echotop', 'rain', 'snow']).optional(),
});

const RADAR_ENDPOINTS = {
  echotop: (icao) => `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&image=COMPOSITE_RADAR/ECHOTOP/PAC&image=COMPOSITE_RADAR/ECHOTOP/WRN&image=COMPOSITE_RADAR/ECHOTOP/ONT&image=COMPOSITE_RADAR/ECHOTOP/QUE&image=COMPOSITE_RADAR/ECHOTOP/ERN`,
  rain: (icao) => `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&image=COMPOSITE_RADAR/LOW_RAIN~CAPPI/PAC&image=COMPOSITE_RADAR/LOW_RAIN~CAPPI/WRN&image=COMPOSITE_RADAR/LOW_RAIN~CAPPI/ONT&image=COMPOSITE_RADAR/LOW_RAIN~CAPPI/QUE&image=COMPOSITE_RADAR/LOW_RAIN~CAPPI/ERN`,
  snow: (icao) => `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&image=COMPOSITE_RADAR/LOW_SNOW~CAPPI/PAC&image=COMPOSITE_RADAR/LOW_SNOW~CAPPI/WRN&image=COMPOSITE_RADAR/LOW_SNOW~CAPPI/ONT&image=COMPOSITE_RADAR/LOW_SNOW~CAPPI/QUE&image=COMPOSITE_RADAR/LOW_SNOW~CAPPI/ERN`,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  const { icao, type = 'echotop' } = result.data;
  try {
    const url = RADAR_ENDPOINTS[type](icao);
    const response = await axios.get(url, { timeout: 7000 });
    if (!response.data?.data || !Array.isArray(response.data.data)) {
      console.error('NavCanada API invalid response:', response.data);
      return res.status(502).json({ error: 'Invalid response from NavCanada API', navcanada: response.data });
    }
    // Collect all frames from all returned radar products
    let allFrames = [];
    for (const radarData of response.data.data) {
      if (!radarData?.text) continue;
      let parsedData;
      try {
        parsedData = JSON.parse(radarData.text);
      } catch (e) {
        console.error('Malformed radar data from NavCanada:', radarData.text);
        continue;
      }
      if (parsedData.frame_lists) {
        allFrames.push({
          location: radarData.location,
          frames: parsedData.frame_lists,
        });
      }
    }
    if (allFrames.length === 0) {
      return res.status(404).json({ error: 'No radar data found for this station/type', navcanada: response.data });
    }
    res.json({ frames: allFrames });
  } catch (err) {
    console.error('Radar fetch error:', err, err?.response?.data);
    res.status(500).json({ 
      error: 'Failed to fetch radar data', 
      details: err instanceof Error ? err.message : String(err),
      navcanada: err?.response?.data || null
    });
  }
} 