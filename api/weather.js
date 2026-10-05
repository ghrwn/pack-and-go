const WEATHER_API_URL = 'https://api.weatherapi.com/v1/forecast.json';

export default async function handler(request, response) {
    const { q } = request.query;

    if (!q) {
        return response.status(400).json({
            error: 'Destination is required.'
        });
    }

    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: 'Weather API key is not configured.'
        });
    }

    const url = `${WEATHER_API_URL}?key=${apiKey}&q=${encodeURIComponent(q)}&days=3`;

    try {
        const apiResponse = await fetch(url);

        if (!apiResponse.ok) {
            return response.status(apiResponse.status).json({
                error: 'Unable to get weather information.'
            });
        }

        const data = await apiResponse.json();

        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({
            error: 'Weather service is unavailable.'
        });
    }
}