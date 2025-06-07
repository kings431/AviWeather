import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Missing image id' });
    return;
  }

  // Log the requested image ID
  console.log('Radar image requested:', id);

  const baseUrl = `https://plan.navcanada.ca/weather/api/alpha/image/${id}`;

  try {
    // Try jpeg first
    try {
      const imgRes = await axios.get(`${baseUrl}.jpeg`, {
        responseType: 'stream',
        timeout: 7000,
      });
      res.setHeader('Content-Type', 'image/jpeg');
      imgRes.data.pipe(res);
      return;
    } catch (e) {
      // Try png if jpeg not found
      try {
        const imgRes = await axios.get(`${baseUrl}.png`, {
          responseType: 'stream',
          timeout: 7000,
        });
        res.setHeader('Content-Type', 'image/png');
        imgRes.data.pipe(res);
        return;
      } catch (pngErr) {
        // Log both errors
        console.error('Radar image not found:', id, 'jpeg error:', e?.message, 'png error:', pngErr?.message);
        res.status(404).json({ error: 'Radar image not found', id, jpegError: e?.message, pngError: pngErr?.message });
        return;
      }
    }
  } catch (error) {
    console.error('Radar image fetch error:', error);
    res.status(404).json({ error: 'Radar image not found', details: error?.message });
  }
}