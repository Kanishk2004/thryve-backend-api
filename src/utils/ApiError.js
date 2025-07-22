// this is to standardise the error response from the api
// this functionality is built-in in the node so this class just extends it

class ApiError extends Error {
	constructor(statusCode, message = "Something went wrong") {
		super(message);
		this.statusCode = statusCode;
		this.success = false;
	}
}