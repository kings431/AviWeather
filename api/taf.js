import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  if (!icao) {
    return res.status(400).json({ error: 'Missing ICAO code' });
  }
  try {
    const url = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&alpha=taf&_=${Date.now()}`;
    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch TAF', details: error.message });
  }
} 