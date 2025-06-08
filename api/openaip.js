import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  const apiKey = process.env.VITE_OPENAIP_API_KEY || process.env.OPENAIP_API_KEY;

  if (!icao) {
    return res.status(400).json({ error: 'Missing ICAO code' });
  }

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const response = await axios.get(
      `https://api.core.openaip.net/api/airports?search=${icao.toUpperCase()}`,
      { headers }
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