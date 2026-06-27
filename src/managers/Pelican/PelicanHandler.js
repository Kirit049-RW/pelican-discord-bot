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
     * Make a request to the Pelican application API.
     * @param endpoint - The endpoint to request.
     * @param method - The HTTP method to use (default: 'get').
     * @param data - The data to send with the request (default: null).
     * @return {Promise<any>}
     */
    async requestApplication(endpoint, method = 'get', data = null) {
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