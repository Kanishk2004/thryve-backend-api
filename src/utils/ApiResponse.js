// this is to standardise the response to be sent from our api
// this is always done in class format

class ApiResponse {
	constructor(statusCode, data, message) {
		this.statusCode = statusCode;
		this.data = data;
		this.message = message || 'message not provided';
		this.success = statusCode < 400;
	}
}

export { ApiResponse };
