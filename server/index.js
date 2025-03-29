import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";
import path from "path";

dotenv.config();

dbConnection();

const port = process.env.PORT || 5000;

const app = express();
const _dirname = path.resolve();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(morgan("dev"));
app.use("/api", routes);

// Serve static files BEFORE error middleware
app.use(express.static(path.join(_dirname, "/client/dist")));
app.get('*', (_, res) => {
  res.sendFile(path.resolve(_dirname, "client", "dist", "index.html"));
});

// Error middleware comes last
app.use(routeNotFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server listening on ${port}`));