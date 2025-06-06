import axios from 'axios';

export default async function handler(req, res) {
  const { icao, type } = req.query; // type: 'metar' or 'taf'
  if (!icao || !type) {
    return res.status(400).json({ error: 'Missing icao or type parameter' });
  }

  const NOAA_URL = `https://aviationweather.gov/cgi-bin/data/${type}.php?ids=${icao}&format=raw`;

  try {
    const response = await axios.get(NOAA_URL, {
      headers: {
        'User-Agent': 'AviWeatherApp/1.0 (your@email.com)'
      }
    });
    res.status(200).json({ data: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
} 