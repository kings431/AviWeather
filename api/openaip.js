import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  const apiKey = process.env.VITE_OPENAIP_API_KEY || process.env.OPENAIP_API_KEY;

  if (!icao) {
    return res.status(400).json({ error: 'Missing ICAO code' });
  }
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAIP API key is missing' });
  }

  try {
    const response = await axios.get(
      `https://api.core.openaip.net/api/airports?search=${icao.toUpperCase()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Airport not found' });
    }
    res.status(200).json(response.data);
  } catch (error) {
    console.error('OpenAIP backend error:', error?.response?.data || error);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
}