export function generatePackingList(tripLength, activities, weather) {
    const packingList = {
        clothing: [],
        toiletries: [],
        documents: [],
        electronics: [],
        medicine: [],
        travelGear: []
    };

    const addItem = (category, item) => {
        if (!packingList[category].includes(item)) {
            packingList[category].push(item);
        }
    };

    // Basic clothing based on trip length
    addItem('clothing', `${Math.min(tripLength, 7)} shirt(s)`);
    addItem('clothing', `${Math.min(tripLength, 7)} pair(s) of underwear`);
    addItem('clothing', `${Math.min(tripLength, 7)} pair(s) of socks`);
    addItem('clothing', 'Comfortable pants or shorts');
    addItem('clothing', 'Comfortable shoes');

    // Basic toiletries
    addItem('toiletries', 'Toothbrush');
    addItem('toiletries', 'Toothpaste');
    addItem('toiletries', 'Deodorant');
    addItem('toiletries', 'Shampoo and soap');

    // Basic documents
    addItem('documents', 'Passport or valid ID');
    addItem('documents', 'Travel documents');
    addItem('documents', 'Wallet');

    // Basic electronics
    addItem('electronics', 'Phone');
    addItem('electronics', 'Phone charger');
    addItem('electronics', 'Power bank');

    // Basic medicine
    addItem('medicine', 'Personal medications');
    addItem('medicine', 'Basic first-aid supplies');

    // Basic travel gear
    addItem('travelGear', 'Travel bag');
    addItem('travelGear', 'Reusable water bottle');

    // Activity-based recommendations
    if (activities.includes('hiking')) {
        addItem('clothing', 'Hiking clothes');
        addItem('clothing', 'Hiking shoes');
        addItem('travelGear', 'Small backpack');
        addItem('travelGear', 'Water bottle');
    }

    if (activities.includes('swimming')) {
        addItem('clothing', 'Swimsuit');
        addItem('travelGear', 'Quick-dry towel');
    }

    if (activities.includes('beach')) {
        addItem('clothing', 'Swimsuit');
        addItem('travelGear', 'Beach towel');
        addItem('travelGear', 'Sunglasses');
        addItem('travelGear', 'Sunscreen');
    }

    if (activities.includes('business')) {
        addItem('clothing', 'Business outfit');
        addItem('clothing', 'Dress shoes');
    }

    if (activities.includes('sightseeing')) {
        addItem('clothing', 'Comfortable walking shoes');
        addItem('travelGear', 'Small day bag');
    }

    // Weather-based recommendations
    if (weather) {
        const forecastDays = weather.forecast?.forecastday || [];

        const temperatures = forecastDays.flatMap((day) => [
            day.day.mintemp_c,
            day.day.maxtemp_c
        ]);

        const minimumTemperature = Math.min(...temperatures);
        const maximumTemperature = Math.max(...temperatures);

        const rainyDay = forecastDays.some(
            (day) => day.day.daily_chance_of_rain >= 50
        );

        if (minimumTemperature < 15) {
            addItem('clothing', 'Light jacket or sweater');
        }

        if (minimumTemperature < 5) {
            addItem('clothing', 'Warm jacket');
            addItem('clothing', 'Warm socks');
        }

        if (maximumTemperature >= 25) {
            addItem('clothing', 'Lightweight clothing');
            addItem('travelGear', 'Sunglasses');
            addItem('travelGear', 'Sunscreen');
        }

        if (rainyDay) {
            addItem('travelGear', 'Umbrella');
            addItem('clothing', 'Rain jacket');
        }
    }

    return packingList;
}