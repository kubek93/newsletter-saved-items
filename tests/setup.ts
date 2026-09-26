import { config } from "dotenv";
import path from "node:path";
import { afterAll, afterEach, beforeAll } from "vitest";
import { network, startNetwork } from "./network";

config({ path: path.resolve(import.meta.dirname, "..", ".env.test") });

beforeAll(() => startNetwork());
afterEach(() => network.resetHandlers());
afterAll(() => network.close());
