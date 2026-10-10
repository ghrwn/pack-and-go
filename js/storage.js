
const STORAGE_KEY = 'packAndGoTrip';
const SAVED_TRIPS_KEY = 'packAndGoSavedTrips';

export function saveTrip(trip) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
        return true;
    } catch (error) {
        console.error('Unable to save current trip:', error);
        return false;
    }
}

export function loadTrip() {
    try {
        const savedTrip = localStorage.getItem(STORAGE_KEY);

        if (!savedTrip) {
            return null;
        }

        return JSON.parse(savedTrip);
    } catch (error) {
        console.error('Unable to load current trip:', error);
        return null;
    }
}

export function clearSavedTrip() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Unable to clear current trip:', error);
        return false;
    }
}

export function getSavedTrips() {
    try {
        const savedTrips = localStorage.getItem(SAVED_TRIPS_KEY);

        if (!savedTrips) {
            return [];
        }

        const parsedTrips = JSON.parse(savedTrips);

        return Array.isArray(parsedTrips) ? parsedTrips : [];
    } catch (error) {
        console.error('Unable to load saved trips:', error);
        return [];
    }
}

export function saveTrips(trips) {
    try {
        localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips));
        return true;
    } catch (error) {
        console.error('Unable to save trips:', error);
        return false;
    }
}

export function addSavedTrip(trip) {
    const trips = getSavedTrips();

    const savedTrip = {
        ...trip,
        id: trip.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        savedAt: new Date().toISOString()
    };

    trips.push(savedTrip);

    if (!saveTrips(trips)) {
        return null;
    }

    return savedTrip;
}

export function updateSavedTrip(trip) {
    const trips = getSavedTrips();
    const index = trips.findIndex(savedTrip => savedTrip.id === trip.id);

    if (index === -1) {
        return false;
    }

    trips[index] = {
        ...trip,
        savedAt: trips[index].savedAt || new Date().toISOString()
    };

    return saveTrips(trips);
}

export function deleteSavedTrip(id) {
    const trips = getSavedTrips();
    const updatedTrips = trips.filter(trip => trip.id !== id);

    if (updatedTrips.length === trips.length) {
        return false;
    }

    return saveTrips(updatedTrips);
}