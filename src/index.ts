import express, { Request, Response, Application } from "express";
import walletRoutes from "./routes/wallet.route";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerOutput from "./swagger_output.json";
import loggerMiddleware from "./middlewares/logger.middleware";

//For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middlewares
app.use(loggerMiddleware);

//Routes
app.use("/wallet", walletRoutes);

// Api Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerOutput));

app.get("/", (req: Request, res: Response) => {
  res.send("LCDWallet Server");
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});
