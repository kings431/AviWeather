import axios from 'axios';

export default async function handler(req, res) {
  const { icao, type } = req.query; // type: 'sigmet', 'airmet', or 'pirep'
  if (!icao || !type) {
    return res.status(400).json({ error: 'Missing icao or type parameter' });
  }

  // Only allow Canadian airports for now
  if (!icao.toUpperCase().startsWith('C')) {
    return res.status(400).json({ error: 'Weather reports are only available for Canadian airports' });
  }

  const NAVCANADA_URL = `https://plan.navcanada.ca/weather/api/alpha/?site=${icao}&alpha=${type}`;

  try {
    const response = await axios.get(NAVCANADA_URL, {
      headers: {
        'User-Agent': 'AviWeatherApp/1.0 (your@email.com)'
      }
    });

    // Return the data array from the response
    res.status(200).json(response.data.data || []);
  } catch (error) {
    console.error('Error fetching weather reports:', error);
    res.status(500).json({ error: 'Failed to fetch weather reports' });
  }
} 