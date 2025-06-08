import axios from 'axios';

export default async function handler(req, res) {
  const { icao, lat, lon, radius } = req.query;
  const apiKey = process.env.OPENAIP_API_KEY;

  if (!icao && (!lat || !lon)) {
    return res.status(400).json({ error: 'Missing ICAO code or lat/lon' });
  }

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      'x-openaip-api-key': apiKey,
    };

    let url;
    if (icao) {
      url = `https://api.core.openaip.net/api/airports?search=${icao.toUpperCase()}`;
    } else {
      // Use lat/lon search for nearest airports
      url = `https://api.core.openaip.net/api/airports?lat=${lat}&lon=${lon}`;
      if (radius) url += `&radius=${radius}`;
    }

    const response = await axios.get(url, { headers });

    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    res.status(200).json(response.data);
  } catch (error) {
    console.error('OpenAIP backend error:', error?.response?.data || error);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
}
