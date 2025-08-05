/**
 * Custom API Error class for standardized error handling
 * Extends the native Error class with additional properties for HTTP responses
 */
class ApiError extends Error {
	constructor(
		statusCode,
		message = "Something went wrong",
		errors = [],
		stack = ""
	) {
		super(message);
		this.statusCode = statusCode;
		this.data = null;
		this.message = message;
		this.success = false;
		this.errors = errors;

		// Capture stack trace if not provided
		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	// Static helper methods for common HTTP errors
	static badRequest(message = "Bad Request", errors = []) {
		return new ApiError(400, message, errors);
	}

	static unauthorized(message = "Unauthorized") {
		return new ApiError(401, message);
	}

	static forbidden(message = "Forbidden") {
		return new ApiError(403, message);
	}

	static notFound(message = "Not Found") {
		return new ApiError(404, message);
	}

	static conflict(message = "Conflict") {
		return new ApiError(409, message);
	}

	static unprocessableEntity(message = "Unprocessable Entity", errors = []) {
		return new ApiError(422, message, errors);
	}

	static internalServer(message = "Internal Server Error") {
		return new ApiError(500, message);
	}
}

export default ApiError;
