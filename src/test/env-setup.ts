import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables BEFORE any modules are imported
config({
  path: resolve(__dirname, '../../.env.test')
});