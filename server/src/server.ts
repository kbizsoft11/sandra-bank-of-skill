import { env } from "./config/env";
import app from "./app";
import { connectDB } from './config/database';


const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(
        `🚀 Server running on port ${env.PORT}`
      );
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();