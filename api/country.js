const COUNTRY_API_URL =
    'https://api.restcountries.com/countries/v5/names.common';

export default async function handler(request, response) {
    const { name } = request.query;

    if (!name) {
        return response.status(400).json({
            error: 'Country name is required.'
        });
    }

    const apiKey = process.env.REST_COUNTRIES_API_KEY;

    if (!apiKey) {
        return response.status(500).json({
            error: 'Country API key is not configured.'
        });
    }

    const url =
        `${COUNTRY_API_URL}/${encodeURIComponent(name)}`;

    try {
        const apiResponse = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!apiResponse.ok) {
            return response.status(apiResponse.status).json({
                error: 'Unable to get country information.'
            });
        }

        const result = await apiResponse.json();

        return response.status(200).json(
            result.data.objects[0]
        );
    } catch (error) {
        return response.status(500).json({
            error: 'Country service is unavailable.'
        });
    }
}