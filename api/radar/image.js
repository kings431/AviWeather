import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Missing image id' });
    return;
  }

  // Attempt fetching as jpeg, fall back to png if jpeg fails.
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
      const imgRes = await axios.get(`${baseUrl}.png`, {
        responseType: 'stream',
        timeout: 7000,
      });
      res.setHeader('Content-Type', 'image/png');
      imgRes.data.pipe(res);
      return;
    }
  } catch (error) {
    res.status(404).json({ error: 'Radar image not found' });
  }
}