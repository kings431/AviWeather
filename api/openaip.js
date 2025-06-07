import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  const apiKey = process.env.OPENAIP_API_KEY;

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
    res.status(error.response?.status || 500).json({ error: error.message, details: error.response?.data });
  }
}