import 'dotenv/config';

import { app } from './app.js';
import { expirePhotosOnce, startExpiryJob } from './jobs/expirePhotos.js';

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  startExpiryJob();
  expirePhotosOnce().catch((err) => console.error('[expiryJob] initial run failed:', err));
});
