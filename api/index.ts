import app from '../server/src/index.js';
import { bootstrapInitialAdmin } from '../server/src/db/bootstrapAdmin.js';

let isBootstrapped = false;

export default async function handler(req: any, res: any) {
  if (!isBootstrapped) {
    try {
      await bootstrapInitialAdmin();
    } catch (err) {
      console.error('[Vercel Bootstrap Error]:', err);
    }
    isBootstrapped = true;
  }
  return app(req, res);
}
