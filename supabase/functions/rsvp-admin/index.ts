import { handleAdmin } from '../_shared/handlers.ts';
import { createStore, loadConfig } from '../_shared/runtime.ts';

const cfg = loadConfig();
const store = createStore();

Deno.serve((req: Request) => handleAdmin(req, store, cfg));
