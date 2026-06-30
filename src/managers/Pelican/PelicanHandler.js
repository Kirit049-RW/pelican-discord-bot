const axios = require('axios');
const PelicanAPIError = require("./PelicanAPIError");

module.exports = class PelicanHandler {
    constructor(client) {
        this.client = client;
        this.logger = client.logger;
        this.config = client.config["pelican"];
        this.url = this.config.url.trim()

        this.domain = this.url.endsWith("/") ? this.url.slice(0, -1) : this.url;
    }

    /**
     * Validate the Pelican URL by making a request to the root endpoint and checking the response.
     * @return {Promise<boolean>}
     */
    async validateUrl() {
        try {
            const response = await axios.get(this.domain, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 5000,
                validateStatus: () => true
            });

            if ([200, 401, 403].includes(response.status)) {
                return true;
            }

            this.logger.pelican(`⚠️ Received unexpected response from Pelican application: ${response.status} ${response.statusText}`);
            return false;
        } catch (error) {
            this.logger.pelican(`⚠️ Failed to connect to Pelican application at ${this.domain}: ${error.message}`);
            return false;
        }
    }

    /**
     * Make a request to the Pelican application API.
     * @param endpoint - The endpoint to request.
     * @param method - The HTTP method to use (default: 'get').
     * @param data - The data to send with the request (default: null).
     * @return {Promise<any>}
     */
    async requestApplication(endpoint, method = 'get', data = null) {
        /* Check if the URL is valid */
        const isValidUrl = await this.validateUrl();
        if (!isValidUrl) throw new PelicanAPIError({ message: "The URL provided is not valid!" }, data, method);

        try {
            const response = await axios({
                method: method,
                url: `${this.domain}/api/application/${endpoint}`,
                headers: {
                    'responseEncoding': 'utf8',
                    'Authorization': `Bearer ${this.config.apiKeyApp}`,
                    'Accept': 'application/json',
                    'Content-Type': `${!endpoint.includes('files/write') ? 'application/json' : ''}`
                },
                data
            });

            if (response.data?.data) return response.data.data;
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new PelicanAPIError(error, data, method);
            }

            throw error;
        }
    }

    /**
     * Make a request to the Pelican client API.
     * @param endpoint - The endpoint to request.
     * @param method - The HTTP method to use (default: 'get').
     * @param data - The data to send with the request (default: null).
     * @return {Promise<any>}
     */
    async requestClient(endpoint, method = 'get', data = null) {
        /* Check if the URL is valid */
        const isValidUrl = await this.validateUrl();
        if (!isValidUrl) throw new Error("The URL provided is not valid!");

        try {
            const response = await axios({
                method: method,
                url: `${this.domain}/api/client/${endpoint}`,
                headers: {
                    'responseEncoding': 'utf8',
                    'Authorization': `Bearer ${this.config.apiKeyApp}`,
                    'Accept': 'application/json',
                    'Content-Type': `${!endpoint.includes('files/write') ? 'application/json' : ''}`
                },
                data
            });

            if (response.data?.data) return response.data.data;
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new PelicanAPIError(error, data, method);
            }

            throw error;
        }
    }

    /**
     * Handle errors from Pelican API requests and log appropriate messages.
     * @param err - The error object.
     * @param endpoint - The endpoint that caused the error.
     * @param method - The HTTP method used for the request.
     * @return {*}
     */
    handlePelicanError(err, endpoint = "/", method = "get") {
        if (!(err instanceof PelicanAPIError)) throw err;

        if (err.isUnauthorized) return this.logger.pelican(`[${method}] ${endpoint} The API key provided is invalid or missing.`);

        if (err.isForbidden) return this.logger.pelican(`[${method}] ${endpoint} You don't have permission to perform this action.`);

        if (err.isNotFound) return this.logger.pelican(`[${method}] ${endpoint} The requested resource was not found.`);

        if (err.isRateLimited) return this.logger.pelican(`[${method}] ${endpoint} You are being rate limited. Please try again later.`);

        if (err.firstError) return this.logger.pelican(`[${method}] ${endpoint} ${err.firstError}`);

        return this.logger.pelican(`${endpoint} ${err.message}`);
    }
}