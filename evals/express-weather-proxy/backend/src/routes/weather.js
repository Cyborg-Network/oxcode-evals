const { Router } = require('express');

const router = Router();

router.get('/', async (req, res) => {
  const { lat, lon } = req.query;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({ error: `Open-Meteo returned ${response.status}` });
    }

    const data = await response.json();

    if (!data.current_weather) {
      return res.status(502).json({ error: 'No current_weather in Open-Meteo response' });
    }

    const { temperature, windspeed, weathercode, is_day } = data.current_weather;

    // Extract current humidity from the hourly data
    const now = new Date();
    const currentHour = now.getUTCHours();
    const humidity =
      data.hourly?.relativehumidity_2m?.[currentHour] ?? null;

    return res.json({ temperature, windspeed, weathercode, is_day, humidity });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch weather data' });
  }
});

module.exports = router;