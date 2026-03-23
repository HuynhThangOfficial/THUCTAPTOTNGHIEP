/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai_bot from "../ai_bot.js";
import type * as boosts from "../boosts.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as engagement_bot from "../engagement_bot.js";
import type * as firecrawl_bot from "../firecrawl_bot.js";
import type * as firecrawl_db from "../firecrawl_db.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as push from "../push.js";
import type * as social from "../social.js";
import type * as university from "../university.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai_bot: typeof ai_bot;
  boosts: typeof boosts;
  chat: typeof chat;
  crons: typeof crons;
  engagement_bot: typeof engagement_bot;
  firecrawl_bot: typeof firecrawl_bot;
  firecrawl_db: typeof firecrawl_db;
  http: typeof http;
  messages: typeof messages;
  push: typeof push;
  social: typeof social;
  university: typeof university;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
