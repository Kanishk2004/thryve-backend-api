import express from 'express';
import cors from 'cors';

const app = express();

// using cors as the middleware to restrict the unknown URLs to access our database
app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);

// common middlewares
app.use(express.json({ limit: '16kb' })); // to limit the data comming in json form
app.use(express.urlencoded({ extended: true, limit: '16kb' })); // limiting the data comming through url
app.use(express.static('public')); // all the images and other assets will be put in public folder outside src dir

// import routes
import healthCheckRouter from './routes/healthCheck.routes.js';

app.use('/api/v1/healthcheck', healthCheckRouter);

export { app };