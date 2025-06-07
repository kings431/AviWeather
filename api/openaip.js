import axios from 'axios';

export default async function handler(req, res) {
  const { icao } = req.query;
  if (!icao) {
    return res.status(400).json({ error: 'Missing ICAO code' });
  }

  try {
    // Use OurAirports API with bounding box and airport param for best match
    const response = await axios.get(`https://ourairports.com/airports.json?airport=${icao.toUpperCase()}&limit=1`);
    const airports = response.data;
    // Find the airport by ICAO code (ident)
    const airport = airports.find((a) => a.ident && a.ident.toUpperCase() === icao.toUpperCase());
    if (!airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }
    res.status(200).json({
      items: [
        {
          icao: airport.ident,
          iata: airport.iata_code,
          name: airport.name,
          city: airport.municipality,
          country: airport.iso_country,
          elevation: { value: airport.elevation_ft },
          geometry: { coordinates: [parseFloat(airport.longitude_deg), parseFloat(airport.latitude_deg)] },
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}