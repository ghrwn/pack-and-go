
import { getCountryInfo, getWeather } from './api.js';
import { generatePackingList } from './packing.js';
import {
    saveTrip,
    loadTrip,
    getSavedTrips,
    addSavedTrip,
    updateSavedTrip,
    deleteSavedTrip,
    clearSavedTrip
} from './storage.js';

const tripForm = document.querySelector('#trip-form');

const categoryNames = {
    clothing: 'Clothing',
    toiletries: 'Toiletries',
    documents: 'Documents',
    electronics: 'Electronics',
    medicine: 'Medicine',
    travelGear: 'Travel Gear'
};

let currentTrip = null;

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function setupDateValidation() {
    const startDateInput = document.querySelector('#start-date');
    const endDateInput = document.querySelector('#end-date');

    startDateInput.min = getTodayString();
    endDateInput.min = startDateInput.value || getTodayString();

    startDateInput.addEventListener('change', () => {
        const today = getTodayString();
        startDateInput.min = today;

        endDateInput.min = startDateInput.value || today;

        if (
            endDateInput.value &&
            startDateInput.value &&
            endDateInput.value <= startDateInput.value
        ) {
            endDateInput.setCustomValidity(
                'The end date must be after the start date.'
            );
        } else {
            endDateInput.setCustomValidity('');
        }
    });

    endDateInput.addEventListener('change', () => {
        validateTripDates(false);
    });
}

function showFormMessage(message, type = 'error') {
    let messageElement = document.querySelector('#trip-form-message');

    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.id = 'trip-form-message';
        messageElement.setAttribute('role', 'status');
        messageElement.setAttribute('aria-live', 'polite');
        tripForm.appendChild(messageElement);
    }

    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
}

function clearFormMessage() {
    const messageElement = document.querySelector('#trip-form-message');

    if (messageElement) {
        messageElement.textContent = '';
        messageElement.className = 'form-message';
    }
}

function validateTripDates(showMessage = true) {
    const startDateInput = document.querySelector('#start-date');
    const endDateInput = document.querySelector('#end-date');

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const today = getTodayString();

    startDateInput.setCustomValidity('');
    endDateInput.setCustomValidity('');

    if (!startDate) {
        if (showMessage) {
            showFormMessage('Please select a start date.');
            startDateInput.focus();
        }
        return false;
    }

    if (startDate < today) {
        startDateInput.setCustomValidity(
            'The start date cannot be in the past.'
        );

        if (showMessage) {
            showFormMessage('Your start date cannot be in the past.');
            startDateInput.reportValidity();
        }

        return false;
    }

    if (!endDate) {
        if (showMessage) {
            showFormMessage('Please select an end date.');
            endDateInput.focus();
        }
        return false;
    }

    if (endDate <= startDate) {
        endDateInput.setCustomValidity(
            'The end date must be after the start date.'
        );

        if (showMessage) {
            showFormMessage(
                'Your end date must be at least one day after your start date.'
            );
            endDateInput.reportValidity();
        }

        return false;
    }

    return true;
}

function normalizeTrip(trip) {
    trip.customItems = Array.isArray(trip.customItems)
        ? trip.customItems
        : [];

    trip.activities = Array.isArray(trip.activities)
        ? trip.activities
        : [];

    trip.packingList = trip.packingList || {};

    Object.keys(categoryNames).forEach(category => {
        if (!Array.isArray(trip.packingList[category])) {
            trip.packingList[category] = [];
        }
    });

    trip.customItems.forEach(item => {
        if (!categoryNames[item.category]) {
            item.category = 'travelGear';
        }

        if (typeof item.packed !== 'boolean') {
            item.packed = false;
        }
    });

    return trip;
}

function saveCurrentTrip() {
    if (!currentTrip) return;

    saveTrip(currentTrip);

    if (currentTrip.id) {
        updateSavedTrip(currentTrip);
    }

    renderSavedTrips();
}

function getAllItems() {
    if (!currentTrip) return [];

    return [
        ...Object.values(currentTrip.packingList).flat(),
        ...currentTrip.customItems
    ];
}

function updateProgress() {
    const percentageElement =
        document.querySelector('#progress-percentage');
    const progressBar =
        document.querySelector('#progress-bar');
    const progressBarFill =
        document.querySelector('#progress-bar-fill');
    const progressCount =
        document.querySelector('#progress-count');

    if (
        !percentageElement ||
        !progressBar ||
        !progressBarFill ||
        !progressCount ||
        !currentTrip
    ) {
        return;
    }

    const allItems = getAllItems();
    const totalItems = allItems.length;
    const packedItems = allItems.filter(item => item.packed).length;

    const percentage = totalItems === 0
        ? 0
        : Math.round((packedItems / totalItems) * 100);

    percentageElement.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressCount.textContent =
        `${packedItems} of ${totalItems} items packed`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function normalizeLocationName(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function validateWeatherCountry(weather, country) {
    const weatherCountry = weather?.location?.country;

    if (!weatherCountry) {
        throw new Error(
            'The weather service did not identify the destination country.'
        );
    }

    const possibleCountryNames = [
        country?.names?.common,
        country?.names?.official,
        ...(Array.isArray(country?.altSpellings)
            ? country.altSpellings
            : [])
    ]
        .filter(Boolean)
        .map(normalizeLocationName);

    const normalizedWeatherCountry =
        normalizeLocationName(weatherCountry);

    const matchesCountry = possibleCountryNames.some(name =>
        name === normalizedWeatherCountry
    );

    if (!matchesCountry) {
        throw new Error(
            `The weather service returned information for ${weatherCountry}, which does not match the verified destination country.`
        );
    }
}

function createChecklist(items, category) {
    return items.map((item, index) => `
        <li class="packing-item ${item.packed ? 'packed' : ''}">
            <label for="${category}-${index}">
                <input
                    type="checkbox"
                    id="${category}-${index}"
                    class="packing-checkbox"
                    data-category="${category}"
                    data-custom="false"
                    data-index="${index}"
                    ${item.packed ? 'checked' : ''}
                >
                <span>${escapeHTML(item.name)}</span>
            </label>
        </li>
    `).join('');
}

function renderPackingList() {
    const container = document.querySelector('#packing-list');

    if (!currentTrip || !container) return;

    normalizeTrip(currentTrip);

    container.innerHTML = `
        <h3>Your Packing List</h3>

        <section class="packing-progress">
            <div class="progress-heading">
                <h4>Packing Progress</h4>
                <span id="progress-percentage">0%</span>
            </div>

            <div
                class="progress-track"
                role="progressbar"
                aria-label="Packing progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow="0"
                id="progress-bar"
            >
                <div id="progress-bar-fill"></div>
            </div>

            <p id="progress-count">0 of 0 items packed</p>
        </section>

        ${Object.entries(categoryNames).map(([category, title]) => {
            const generatedItems =
                currentTrip.packingList[category] || [];

            const customItems = currentTrip.customItems
                .map((item, index) => ({
                    ...item,
                    originalIndex: index
                }))
                .filter(item => item.category === category);

            return `
                <section class="packing-category">
                    <h4>${title}</h4>
                    <ul>
                        ${createChecklist(generatedItems, category)}

                        ${customItems.map(item => `
                            <li class="packing-item custom-packing-item
                                ${item.packed ? 'packed' : ''}">
                                <label for="custom-${item.originalIndex}">
                                    <input
                                        type="checkbox"
                                        id="custom-${item.originalIndex}"
                                        class="packing-checkbox"
                                        data-category="${category}"
                                        data-custom="true"
                                        data-index="${item.originalIndex}"
                                        ${item.packed ? 'checked' : ''}
                                    >
                                    <span>${escapeHTML(item.name)}</span>
                                </label>

                                <button
                                    type="button"
                                    class="remove-custom-item"
                                    data-remove-index="${item.originalIndex}"
                                    aria-label="Remove ${escapeHTML(item.name)}"
                                >Remove</button>
                            </li>
                        `).join('')}
                    </ul>
                </section>
            `;
        }).join('')}

        <section class="custom-items-section">
            <h4>Add a Custom Item</h4>
            <p>Add your own item and choose the category where it belongs.</p>

            <form id="custom-item-form">
                <div class="custom-form-group">
                    <label for="custom-item-input">Item name</label>
                    <input
                        type="text"
                        id="custom-item-input"
                        placeholder="e.g. Camera"
                        maxlength="100"
                        required
                    >
                </div>

                <div class="custom-form-group">
                    <label for="custom-item-category">Category</label>
                    <select id="custom-item-category" required>
                        ${Object.entries(categoryNames).map(([value, label]) => `
                            <option value="${value}">${label}</option>
                        `).join('')}
                    </select>
                </div>

                <button type="submit">Add Item</button>
            </form>

            <p id="custom-item-message" role="status"></p>
        </section>
    `;

    container.querySelectorAll('.packing-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const category = checkbox.dataset.category;
            const index = Number(checkbox.dataset.index);
            const isCustom = checkbox.dataset.custom === 'true';

            const item = isCustom
                ? currentTrip.customItems[index]
                : currentTrip.packingList[category]?.[index];

            if (!item) return;

            item.packed = checkbox.checked;

            checkbox.closest('.packing-item')
                .classList.toggle('packed', checkbox.checked);

            saveCurrentTrip();
            updateProgress();
        });
    });

    const customItemForm =
        document.querySelector('#custom-item-form');

    customItemForm.addEventListener('submit', event => {
        event.preventDefault();

        const customItemInput =
            document.querySelector('#custom-item-input');
        const customItemCategory =
            document.querySelector('#custom-item-category');
        const message =
            document.querySelector('#custom-item-message');

        const itemName = customItemInput.value.trim();
        const category = customItemCategory.value;

        if (!itemName) {
            message.textContent = 'Please enter an item name.';
            customItemInput.focus();
            return;
        }

        if (!categoryNames[category]) {
            message.textContent = 'Please select a valid category.';
            customItemCategory.focus();
            return;
        }

        const duplicate = currentTrip.customItems.some(
            item => item.name.toLowerCase() === itemName.toLowerCase()
        );

        if (duplicate) {
            message.textContent =
                'That custom item is already on your list.';
            return;
        }

        currentTrip.customItems.push({
            name: itemName,
            category,
            packed: false
        });

        saveCurrentTrip();
        renderPackingList();

        document.querySelector('#custom-item-message').textContent =
            `${itemName} added to ${categoryNames[category]}.`;

        document.querySelector('#custom-item-input').focus();
    });

    container.querySelectorAll('[data-remove-index]').forEach(button => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.removeIndex);
            const removedItem = currentTrip.customItems[index];

            if (!removedItem) return;

            const removedName = removedItem.name;

            currentTrip.customItems.splice(index, 1);

            saveCurrentTrip();
            renderPackingList();

            document.querySelector('#custom-item-message').textContent =
                `${removedName} removed.`;
        });
    });

    updateProgress();
}

function renderSavedTrips() {
    const container = document.querySelector('#saved-trips-list');
    const message = document.querySelector('#saved-trips-message');

    if (!container) return;

    const trips = getSavedTrips();

    if (!trips.length) {
        container.innerHTML = '<p>You have no saved trips yet.</p>';
        return;
    }

    container.innerHTML = trips.map(trip => {
        const allItems = [
            ...Object.values(trip.packingList || {}).flat(),
            ...(trip.customItems || [])
        ];

        const packedCount = allItems.filter(item => item.packed).length;

        return `
            <article class="saved-trip-card">
                <h3>${escapeHTML(trip.destination)}</h3>
                <p><strong>Start:</strong> ${escapeHTML(trip.startDate)}</p>
                <p><strong>End:</strong> ${escapeHTML(trip.endDate)}</p>
                <p>${packedCount} of ${allItems.length} items packed</p>

                <div class="saved-trip-actions">
                    <button
                        type="button"
                        data-open-trip="${escapeHTML(trip.id)}"
                    >Open Trip</button>

                    <button
                        type="button"
                        class="remove-custom-item"
                        data-delete-trip="${escapeHTML(trip.id)}"
                    >Delete</button>
                </div>
            </article>
        `;
    }).join('');

    container.querySelectorAll('[data-open-trip]').forEach(button => {
        button.addEventListener('click', async () => {
            const trip = getSavedTrips().find(
                item => item.id === button.dataset.openTrip
            );

            if (!trip) return;

            currentTrip = normalizeTrip(trip);
            saveTrip(currentTrip);
            restoreTripForm(currentTrip);
            renderPackingList();

            await loadDestinationInfo(currentTrip.destination);
            await loadWeatherInfo(currentTrip.destination);

            document.querySelector('#packing-list').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            if (message) {
                message.textContent =
                    `Opened trip to ${trip.destination}.`;
            }
        });
    });

    container.querySelectorAll('[data-delete-trip]').forEach(button => {
        button.addEventListener('click', () => {
            const tripId = button.dataset.deleteTrip;
            const trip = getSavedTrips().find(item => item.id === tripId);

            if (!trip) return;

            const confirmed = window.confirm(
                `Delete the saved trip to ${trip.destination}?`
            );

            if (!confirmed) return;

            deleteSavedTrip(tripId);

            if (currentTrip?.id === tripId) {
                currentTrip = null;
                clearSavedTrip();

                document.querySelector('#packing-list').innerHTML = '';
                document.querySelector('#country-info').innerHTML = '';
                document.querySelector('#weather-info').innerHTML = '';
            }

            renderSavedTrips();

            if (message) {
                message.textContent =
                    `Deleted trip to ${trip.destination}.`;
            }
        });
    });
}

async function loadDestinationInfo(destination) {
    const countryInfo = document.querySelector('#country-info');

    countryInfo.textContent = 'Loading destination information...';

    try {
        const country = await getCountryInfo(destination);
        const capital = country.capitals?.[0]?.name || 'N/A';

        countryInfo.innerHTML = `
            <h3>Destination Information</h3>
            <p><strong>Country:</strong> ${escapeHTML(country.names.common)}</p>
            <p><strong>Capital:</strong> ${escapeHTML(capital)}</p>
            <p><strong>Region:</strong> ${escapeHTML(country.region)}</p>
            <p><strong>Subregion:</strong> ${escapeHTML(country.subregion)}</p>
            <p><strong>Flag:</strong> ${escapeHTML(country.flag?.emoji || '')}</p>
        `;
        return country;
    } catch (error) {
        console.error('Country Information Error:', error);
        countryInfo.textContent =
            'Unable to load destination information.';
        throw error;
    }
}

async function loadWeatherInfo(destination) {
    const weatherInfo = document.querySelector('#weather-info');

    weatherInfo.textContent = 'Loading weather information...';

    try {
        // Verify the country before displaying weather information.
        const country = await getCountryInfo(destination);
        const weather = await getWeather(destination);

        validateWeatherCountry(weather, country);

        const current = weather.current;
        const forecastDays = weather.forecast?.forecastday;

        if (
            !current ||
            !current.condition ||
            !Array.isArray(forecastDays)
        ) {
            throw new Error(
                'The weather service returned incomplete data.'
            );
        }

        weatherInfo.innerHTML = `
            <h3>Weather Information</h3>
            <p><strong>Current Temperature:</strong> ${current.temp_c}°C</p>
            <p><strong>Feels Like:</strong> ${current.feelslike_c}°C</p>
            <p><strong>Condition:</strong> ${escapeHTML(current.condition.text)}</p>
            <p><strong>Humidity:</strong> ${current.humidity}%</p>

            <h4>3-Day Forecast</h4>

            ${forecastDays.map(day => `
                <div class="forecast-day">
                    <p><strong>${escapeHTML(day.date)}</strong></p>
                    <p>High: ${day.day.maxtemp_c}°C</p>
                    <p>Low: ${day.day.mintemp_c}°C</p>
                    <p>${escapeHTML(day.day.condition.text)}</p>
                    <p>Chance of rain: ${day.day.daily_chance_of_rain}%</p>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Weather Error:', error);
        weatherInfo.textContent =
            'Unable to load weather information for this destination. Check the destination and try again.';
    }
}

function restoreTripForm(trip) {
    document.querySelector('#destination').value = trip.destination;
    document.querySelector('#start-date').value = trip.startDate;
    document.querySelector('#end-date').value = trip.endDate;

    document.querySelectorAll('input[name="activities"]').forEach(checkbox => {
        checkbox.checked = trip.activities.includes(checkbox.value);
    });
}

setupDateValidation();

tripForm.addEventListener('input', clearFormMessage);

tripForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearFormMessage();

    const destinationInput = document.querySelector('#destination');
    const startDateInput = document.querySelector('#start-date');
    const endDateInput = document.querySelector('#end-date');

    const destination = destinationInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!destination) {
        showFormMessage('Please enter your destination.');
        destinationInput.focus();
        return;
    }

    if (!validateTripDates()) {
        return;
    }

    const activities = Array.from(
        document.querySelectorAll('input[name="activities"]:checked')
    ).map(checkbox => checkbox.value);

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const tripLength = Math.round(
        (end - start) / (1000 * 60 * 60 * 24)
    );

    const submitButton = tripForm.querySelector('button[type="submit"]');
    const weatherInfo = document.querySelector('#weather-info');
    const countryInfo = document.querySelector('#country-info');
    const packingListContainer = document.querySelector('#packing-list');

    submitButton.disabled = true;
    submitButton.textContent = 'Creating Your Packing List...';

    weatherInfo.textContent = 'Checking destination weather...';
    countryInfo.textContent = 'Verifying destination...';
    packingListContainer.textContent = 'Creating your packing list...';

    try {
        // Verify the country first. If it cannot be verified, no trip is saved.
        const country = await getCountryInfo(destination);
        const weather = await getWeather(destination);

        // Prevent weather from a different country being shown as this trip's weather.
        validateWeatherCountry(weather, country);

        const generatedList = generatePackingList(
            tripLength,
            activities,
            weather
        );

        const newTrip = normalizeTrip({
            destination,
            startDate,
            endDate,
            activities,
            packingList: Object.fromEntries(
                Object.entries(generatedList).map(([category, items]) => [
                    category,
                    items.map(name => ({ name, packed: false }))
                ])
            ),
            customItems: []
        });

        const savedTrip = addSavedTrip(newTrip);

        if (savedTrip) {
            currentTrip = normalizeTrip(savedTrip);
        } else {
            currentTrip = newTrip;
            currentTrip.id = `${Date.now()}`;
        }

        saveTrip(currentTrip);
        renderPackingList();
        renderSavedTrips();

        const capital = country.capitals?.[0]?.name || 'N/A';

        countryInfo.innerHTML = `
            <h3>Destination Information</h3>
            <p><strong>Country:</strong> ${escapeHTML(country.names.common)}</p>
            <p><strong>Capital:</strong> ${escapeHTML(capital)}</p>
            <p><strong>Region:</strong> ${escapeHTML(country.region)}</p>
            <p><strong>Subregion:</strong> ${escapeHTML(country.subregion)}</p>
            <p><strong>Flag:</strong> ${escapeHTML(country.flag?.emoji || '')}</p>
        `;

        const current = weather.current;
        const forecastDays = weather.forecast.forecastday;

        weatherInfo.innerHTML = `
            <h3>Weather Information</h3>
            <p><strong>Current Temperature:</strong> ${current.temp_c}°C</p>
            <p><strong>Feels Like:</strong> ${current.feelslike_c}°C</p>
            <p><strong>Condition:</strong> ${escapeHTML(current.condition.text)}</p>
            <p><strong>Humidity:</strong> ${current.humidity}%</p>

            <h4>3-Day Forecast</h4>

            ${forecastDays.map(day => `
                <div class="forecast-day">
                    <p><strong>${escapeHTML(day.date)}</strong></p>
                    <p>High: ${day.day.maxtemp_c}°C</p>
                    <p>Low: ${day.day.mintemp_c}°C</p>
                    <p>${escapeHTML(day.day.condition.text)}</p>
                    <p>Chance of rain: ${day.day.daily_chance_of_rain}%</p>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Trip creation error:', error);

        weatherInfo.textContent =
            'Weather information is unavailable for this destination.';
        countryInfo.textContent =
            'Unable to verify destination information. Please check the destination and try again.';
        packingListContainer.textContent =
            'Your packing list could not be generated because the destination could not be verified.';

        showFormMessage(
            error.message ||
            'We could not create your trip. Check your destination and internet connection, then try again.'
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create My Packing List';
    }
});

const savedTrip = loadTrip();

if (
    savedTrip &&
    savedTrip.destination &&
    savedTrip.startDate &&
    savedTrip.endDate &&
    savedTrip.packingList
) {
    currentTrip = normalizeTrip(savedTrip);
    restoreTripForm(savedTrip);
    renderPackingList();

    loadDestinationInfo(savedTrip.destination).catch(() => {});
    loadWeatherInfo(savedTrip.destination);
}

renderSavedTrips();
