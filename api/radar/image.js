import axios from 'axios';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'Missing image id' });
    return;
  }

  // Log the requested image ID
  console.log('Radar image requested:', id);

  // Updated NavCanada image URL format
  const baseUrl = `https://plan.navcanada.ca/weather/api/alpha/image/${id}/data`;

  try {
    const imgRes = await axios.get(baseUrl, {
      responseType: 'stream',
      timeout: 7000,
    });
    
    // Set appropriate content type based on response headers
    const contentType = imgRes.headers['content-type'] || 'image/png';
    res.setHeader('Content-Type', contentType);
    imgRes.data.pipe(res);
  } catch (error) {
    console.error('Radar image fetch error:', error?.message);
    res.status(404).json({ 
      error: 'Radar image not found', 
      id,
      details: error?.message,
      response: error?.response?.data
    });
  }
}