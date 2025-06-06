import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  const apiKey = process.env.VITE_OPENAIP_API_KEY;

  // Debug: log the API key (remove after debugging)
  console.log('OpenAIP API Key (backend):', apiKey);

  if (!icao) {
    return res.status(400).json({ error: 'Missing ICAO code' });
  }

  try {
    const response = await axios.get(`https://api.core.openaip.net/api/airports?icao=${icao}`, {
      headers: {
        'x-api-key': apiKey
      }
    });
    res.status(200).json(response.data);
  } catch (error) {
    // Debug: log the full error response
    console.error('OpenAIP backend error:', error?.response?.data || error);
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
} 