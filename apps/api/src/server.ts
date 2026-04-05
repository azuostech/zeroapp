import app from './app.js';
import { assertEnv, env } from './config/env.js';

assertEnv();

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});
