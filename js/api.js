const WEATHER_API_URL = '/api/weather';
const COUNTRY_API_URL = '/api/country';

async function getLocalConfig() {
    return import('./config.js');
}

export async function getWeather(destination) {
    let url;

    if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ) {
        const { WEATHER_API_KEY } = await getLocalConfig();

        url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(destination)}&days=3`;
    } else {
        url = `${WEATHER_API_URL}?q=${encodeURIComponent(destination)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Unable to get weather information.');
    }

    return response.json();
}

export async function getCountryInfo(destination) {
    const parts = destination.split(',');
    const countryName = parts[parts.length - 1].trim();

    let url;
    let options = {};

    if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ) {
        const { REST_COUNTRIES_API_KEY } = await getLocalConfig();

        url = `https://api.restcountries.com/countries/v5/names.common/${encodeURIComponent(countryName)}`;

        options = {
            headers: {
                Authorization: `Bearer ${REST_COUNTRIES_API_KEY}`
            }
        };
    } else {
        url = `${COUNTRY_API_URL}?name=${encodeURIComponent(countryName)}`;
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error('Unable to get country information.');
    }

    if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ) {
        const result = await response.json();
        return result.data.objects[0];
    }

    return response.json();
}