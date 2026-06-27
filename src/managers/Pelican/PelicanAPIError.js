class PelicanAPIError extends Error {
    constructor(error, requestBody = null, method = "GET") {
        super();

        this.name = "PelicanAPIError";

        this.url = error.config?.url;
        this.status = error.response?.status;
        this.statusText = error.response?.statusText;
        this.method = method.toUpperCase();
        this.body = requestBody;

        this.errors = [];

        if (error.response?.data?.errors) {
            this.errors = error.response.data.errors.map(err => ({
                code: err.code,
                status: err.status,
                detail: err.detail
            }));

            this.message = this.errors.map(err => err.detail).join(", ");
        } else {
            this.message = error.message;
        }
    }

    get firstError() {
        return this.errors[0]?.detail ?? null;
    }

    get isUnauthorized() {
        return this.status === 401;
    }

    get isForbidden() {
        return this.status === 403;
    }

    get isNotFound() {
        return this.status === 404;
    }

    get isRateLimited() {
        return this.status === 429;
    }
}

module.exports = PelicanAPIError;