/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as documentChunks from "../documentChunks.js";
import type * as documentShards from "../documentShards.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as largeDocumentIngestion from "../largeDocumentIngestion.js";
import type * as largeDocuments from "../largeDocuments.js";
import type * as lib_ingestAuth from "../lib/ingestAuth.js";
import type * as lib_pdfExtraction from "../lib/pdfExtraction.js";
import type * as lib_sanitizeText from "../lib/sanitizeText.js";
import type * as lib_textChunking from "../lib/textChunking.js";
import type * as libraryChunks from "../libraryChunks.js";
import type * as libraryDocuments from "../libraryDocuments.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  documentChunks: typeof documentChunks;
  documentShards: typeof documentShards;
  files: typeof files;
  http: typeof http;
  largeDocumentIngestion: typeof largeDocumentIngestion;
  largeDocuments: typeof largeDocuments;
  "lib/ingestAuth": typeof lib_ingestAuth;
  "lib/pdfExtraction": typeof lib_pdfExtraction;
  "lib/sanitizeText": typeof lib_sanitizeText;
  "lib/textChunking": typeof lib_textChunking;
  libraryChunks: typeof libraryChunks;
  libraryDocuments: typeof libraryDocuments;
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
