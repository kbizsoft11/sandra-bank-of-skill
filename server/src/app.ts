import express from "express";
import cors from "cors";
import routes from "./routes";
import { notFoundHandler } from "./middlewares/not-found.middleware";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());



app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;