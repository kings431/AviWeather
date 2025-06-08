import axios from 'axios';
import { z } from 'zod';

const querySchema = z.object({
  station: z.string().length(4).optional(),
  type: z.enum(['CLDWX', 'TURBC']).optional(),
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Validate input
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ 
      error: 'Invalid input',
      details: result.error.errors 
    });
  }
  const { station = 'CYWG', type = 'CLDWX' } = result.data;
  try {
    const response = await axios.get('https://plan.navcanada.ca/weather/api/alpha/', {
      params: {
        site: station.toUpperCase(),
        image: `GFA/${type}`,
      },
      timeout: 5000,
    });
    if (!response.data?.data || !Array.isArray(response.data.data)) {
      return res.status(502).json({ error: 'Invalid response from NavCanada API' });
    }
    const imageData = response.data.data.find(
      (d) => d.location && d.location.includes(`GFA/${type}`)
    );
    if (!imageData?.text) {
      return res.status(404).json({ error: 'No data found for this station/type' });
    }
    let parsedText;
    try {
      parsedText = JSON.parse(imageData.text);
    } catch (e) {
      return res.status(502).json({ error: 'Malformed image data from NavCanada' });
    }
    const frameLists = parsedText.frame_lists;
    if (!Array.isArray(frameLists) || frameLists.length === 0) {
      return res.status(404).json({ error: 'No frames found in image data' });
    }
    const images = [];
    for (const frameList of frameLists) {
      if (!frameList.frames) continue;
      for (const frame of frameList.frames) {
        if (!frame.images || frame.images.length === 0) continue;
        for (const img of frame.images) {
          images.push({
            id: img.id,
            validFrom: frame.sv,
            validTo: frame.ev
          });
        }
      }
    }
    if (images.length === 0) {
      return res.status(404).json({ error: 'No images found in any frame' });
    }
    res.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Failed to retrieve image', details: message });
  }
} 