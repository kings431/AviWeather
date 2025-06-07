import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Missing image id' });
    return;
  }

  // Log the requested image ID
  console.log('Radar image requested:', id);

  // List of possible NavCanada image URLs to try
  const endpoints = [
    `https://plan.navcanada.ca/weather/api/alpha/image/${id}/data`,
    `https://plan.navcanada.ca/weather/api/alpha/image/${id}?format=jpeg`,
    `https://plan.navcanada.ca/weather/api/alpha/image/${id}?format=png`,
    `https://plan.navcanada.ca/weather/api/alpha/image/${id}`,
  ];

  let lastError = null;
  let errorDetails = [];

  for (const url of endpoints) {
    try {
      const imgRes = await axios.get(url, {
        responseType: 'stream',
        timeout: 7000,
      });
      // Set appropriate content type based on response headers
      const contentType = imgRes.headers['content-type'] || 'image/png';
      res.setHeader('Content-Type', contentType);
      imgRes.data.pipe(res);
      return;
    } catch (error) {
      lastError = error;
      errorDetails.push({ url, message: error?.message, status: error?.response?.status });
      // Continue to next endpoint
    }
  }

  // If all attempts fail, return 404 with details
  console.error('Radar image fetch failed for all endpoints:', errorDetails);
  res.status(404).json({ 
    error: 'Radar image not found', 
    id,
    attempts: errorDetails
  });
}