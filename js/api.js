
const WEATHER_API_URL = '/api/weather';
const COUNTRY_API_URL = '/api/country';
const REQUEST_TIMEOUT = 10000;

async function getLocalConfig() {
    return import('./config.js');
}

function getServiceMessage(service, status) {
    if (status === 404 || status === 400) {
        return service === 'weather'
            ? "We couldn't find weather information for that destination. Check the destination name and try again."
            : "We couldn't find country information for that destination. Check the country name and try again.";
    }

    if (status === 401 || status === 403) {
        return `${service === 'weather' ? 'Weather' : 'Country'} information is temporarily unavailable because of an API configuration issue.`;
    }

    if (status === 429) {
        return `${service === 'weather' ? 'Weather' : 'Country'} information is temporarily unavailable because too many requests were made. Please try again later.`;
    }

    return `Unable to load ${service} information right now. Please try again later.`;
}

async function fetchJson(url, options = {}, service) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT
    );

    try {
        let response;

        try {
            response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(
                    `The ${service} request took too long. Please try again.`
                );
            }

            throw new Error(
                `Unable to connect to the ${service} service. Check your internet connection and try again.`
            );
        }

        if (!response.ok) {
            throw new Error(
                getServiceMessage(service, response.status)
            );
        }

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `The ${service} service returned an invalid response. Please try again later.`
            );
        }

        if (!data || typeof data !== 'object') {
            throw new Error(
                `The ${service} service returned unexpected data. Please try again later.`
            );
        }

        if (data.error) {
            const status = data.error.code === 1006 ? 404 : undefined;

            if (status === 404) {
                throw new Error(getServiceMessage(service, status));
            }

            throw new Error(getServiceMessage(service, status));
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function getWeather(destination) {
    if (!destination || !destination.trim()) {
        throw new Error('Please enter a destination to get weather information.');
    }

    let url;

    if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    ) {
        let config;

        try {
            config = await getLocalConfig();
        } catch {
            throw new Error(
                'Weather configuration could not be loaded. Check your local configuration file.'
            );
        }

        const { WEATHER_API_KEY } = config;

        if (!WEATHER_API_KEY) {
            throw new Error(
                'The weather API key is missing from your local configuration.'
            );
        }

        url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(destination)}&days=3`;
    } else {
        url = `${WEATHER_API_URL}?q=${encodeURIComponent(destination)}`;
    }

    const data = await fetchJson(url, {}, 'weather');

    if (!data.forecast || !Array.isArray(data.forecast.forecastday)) {
        throw new Error(
            'Weather information is incomplete or unavailable for this destination.'
        );
    }

    return data;
}

export async function getCountryInfo(destination) {
    if (!destination || !destination.trim()) {
        throw new Error('Please enter a destination to get country information.');
    }

    const parts = destination.split(',');
    const countryName = parts[parts.length - 1].trim();

    let url;
    let options = {};
    const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    if (isLocal) {
        let config;

        try {
            config = await getLocalConfig();
        } catch {
            throw new Error(
                'Country configuration could not be loaded. Check your local configuration file.'
            );
        }

        const { REST_COUNTRIES_API_KEY } = config;

        if (!REST_COUNTRIES_API_KEY) {
            throw new Error(
                'The country API key is missing from your local configuration.'
            );
        }

        url = `https://api.restcountries.com/countries/v5/names.common/${encodeURIComponent(countryName)}`;

        options = {
            headers: {
                Authorization: `Bearer ${REST_COUNTRIES_API_KEY}`
            }
        };
    } else {
        url = `${COUNTRY_API_URL}?name=${encodeURIComponent(countryName)}`;
    }

    const data = await fetchJson(url, options, 'country');

    if (isLocal) {
        const country = data.data?.objects?.[0];

        if (!country) {
            throw new Error(
                "We couldn't find country information for that destination. Check the country name and try again."
            );
        }

        return country;
    }

    if (Array.isArray(data) && data.length === 0) {
        throw new Error(
            "We couldn't find country information for that destination. Check the country name and try again."
        );
    }

    return data;
}