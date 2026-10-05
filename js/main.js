import { getCountryInfo, getWeather } from './api.js';
import { generatePackingList } from './packing.js';

const tripForm = document.querySelector('#trip-form');

tripForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const destination = document.querySelector('#destination').value.trim();
    const startDate = document.querySelector('#start-date').value;
    const endDate = document.querySelector('#end-date').value;

    const activities = Array.from(
        document.querySelectorAll('input[name="activities"]:checked')
    ).map((checkbox) => checkbox.value);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const tripLength = Math.ceil(
        (end - start) / (1000 * 60 * 60 * 24)
    );

    if (tripLength <= 0) {
        alert('Please make sure your end date is after your start date.');
        return;
    }

    console.log('Trip Information:');
    console.log('Destination:', destination);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Trip Length:', tripLength, 'days');
    console.log('Activities:', activities);

    getWeather(destination)
        .then((weather) => {
            console.log('Weather Information:', weather);

            const weatherInfo = document.querySelector('#weather-info');

            const current = weather.current;
            const forecastDays = weather.forecast.forecastday;

            const packingList = generatePackingList(
                tripLength,
                activities,
                weather
            );

            console.log('Packing List:', packingList);

            const packingListContainer =
                document.querySelector('#packing-list');

            const createChecklist = (items, category) => {
                return items
                    .map((item, index) => {
                        const itemId = `${category}-${index}`;

                        return `
                            <li class="packing-item">
                                <label for="${itemId}">
                                    <input
                                        type="checkbox"
                                        id="${itemId}"
                                        class="packing-checkbox"
                                    >
                                    <span>${item}</span>
                                </label>
                            </li>
                        `;
                    })
                    .join('');
            };

            packingListContainer.innerHTML = `
                <h3>Your Packing List</h3>

                <section class="packing-category">
                    <h4>Clothing</h4>
                    <ul>
                        ${createChecklist(
                            packingList.clothing,
                            'clothing'
                        )}
                    </ul>
                </section>

                <section class="packing-category">
                    <h4>Toiletries</h4>
                    <ul>
                        ${createChecklist(
                            packingList.toiletries,
                            'toiletries'
                        )}
                    </ul>
                </section>

                <section class="packing-category">
                    <h4>Documents</h4>
                    <ul>
                        ${createChecklist(
                            packingList.documents,
                            'documents'
                        )}
                    </ul>
                </section>

                <section class="packing-category">
                    <h4>Electronics</h4>
                    <ul>
                        ${createChecklist(
                            packingList.electronics,
                            'electronics'
                        )}
                    </ul>
                </section>

                <section class="packing-category">
                    <h4>Medicine</h4>
                    <ul>
                        ${createChecklist(
                            packingList.medicine,
                            'medicine'
                        )}
                    </ul>
                </section>

                <section class="packing-category">
                    <h4>Travel Gear</h4>
                    <ul>
                        ${createChecklist(
                            packingList.travelGear,
                            'travelGear'
                        )}
                    </ul>
                </section>
            `;

            const checkboxes = document.querySelectorAll(
                '.packing-checkbox'
            );

            checkboxes.forEach((checkbox) => {
                checkbox.addEventListener('change', () => {
                    const packingItem = checkbox.closest('.packing-item');

                    if (checkbox.checked) {
                        packingItem.classList.add('packed');
                    } else {
                        packingItem.classList.remove('packed');
                    }
                });
            });

            weatherInfo.innerHTML = `
                <h3>Weather Information</h3>
                <p><strong>Current Temperature:</strong> ${current.temp_c}°C</p>
                <p><strong>Feels Like:</strong> ${current.feelslike_c}°C</p>
                <p><strong>Condition:</strong> ${current.condition.text}</p>
                <p><strong>Humidity:</strong> ${current.humidity}%</p>

                <h4>3-Day Forecast</h4>

                ${forecastDays.map((day) => `
                    <div class="forecast-day">
                        <p><strong>${day.date}</strong></p>
                        <p>High: ${day.day.maxtemp_c}°C</p>
                        <p>Low: ${day.day.mintemp_c}°C</p>
                        <p>${day.day.condition.text}</p>
                        <p>
                            Chance of rain:
                            ${day.day.daily_chance_of_rain}%
                        </p>
                    </div>
                `).join('')}
            `;
        })
        .catch((error) => {
            console.error('Weather Error:', error);
        });

    getCountryInfo(destination)
        .then((country) => {
            console.log('Country Information:', country);

            const countryInfo = document.querySelector('#country-info');

            const capital = country.capitals?.[0]?.name || 'N/A';

            countryInfo.innerHTML = `
                <h3>Destination Information</h3>
                <p><strong>Country:</strong> ${country.names.common}</p>
                <p><strong>Capital:</strong> ${capital}</p>
                <p><strong>Region:</strong> ${country.region}</p>
                <p><strong>Subregion:</strong> ${country.subregion}</p>
                <p><strong>Flag:</strong> ${country.flag?.emoji || ''}</p>
            `;
        })
        .catch((error) => {
            console.error(error);
        });
});