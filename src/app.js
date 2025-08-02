import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();

// using cors as the middleware to restrict the unknown URLs to access our database
app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);

const swaggerDocument = YAML.load('./swagger.yaml');

// common middlewares
app.use(express.json({ limit: '16kb' })); // to limit the data comming in json form
app.use(express.urlencoded({ extended: true, limit: '16kb' })); // limiting the data comming through url
app.use(express.static('public')); // all the images and other assets will be put in public folder outside src dir
app.use(cookieParser()); // to parse the cookies in the request
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// import routes
import routes from './routes/index.js';

app.use('/api/v1', routes);

export { app };
