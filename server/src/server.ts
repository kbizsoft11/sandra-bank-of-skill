import { env } from "./config/env";
import app from "./app";
import { connectDB } from './config/database';
import { settingsCacheService } from './services/settings-cache.service';


const startServer = async () => {
  try {
    await connectDB();

    // Initialize settings cache on startup
    await settingsCacheService.initialize();

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