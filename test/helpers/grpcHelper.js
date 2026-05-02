"use strict";

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { promisify } = require("util");

const DEFAULT_LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/**
 * Load a .proto file and return the fully resolved gRPC package definition.
 *
 * @param {string} protoPath  - Absolute path to the .proto file.
 * @param {object} [options]  - Optional overrides for proto-loader options.
 * @returns {object} Resolved gRPC package object.
 */
function loadProto(protoPath, options = {}) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    ...DEFAULT_LOADER_OPTIONS,
    ...options,
  });
  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Create a gRPC client and attach promisified versions of every RPC method.
 *
 * The returned object exposes:
 *   - `raw`          : the underlying grpc.Client instance
 *   - `<methodName>` : async (promisified) version of each RPC call
 *
 * @param {Function} ServiceClass  - The generated service client class.
 * @param {string}   address       - Host:port string (e.g. "localhost:50051").
 * @param {object}   [credentials] - gRPC channel credentials (defaults to insecure).
 * @returns {{ raw: grpc.Client, [method: string]: Function }}
 */
function createClient(
  ServiceClass,
  address = "localhost:50051",
  credentials = null,
) {
  const creds = credentials || grpc.credentials.createInsecure();
  const raw = new ServiceClass(address, creds);

  const asyncMethods = {};
  Object.keys(Object.getPrototypeOf(raw)).forEach((method) => {
    if (typeof raw[method] === "function") {
      asyncMethods[method] = promisify(raw[method].bind(raw));
    }
  });

  return { raw, ...asyncMethods };
}

/**
 * Wait until the client channel is READY (or the deadline passes).
 *
 * @param {{ raw: grpc.Client }} client    - Object returned by createClient().
 * @param {number}              [ms=5000] - Deadline in milliseconds.
 * @returns {Promise<void>}
 */
function waitForReady(client, ms = 5000) {
  return new Promise((resolve, reject) => {
    client.raw.waitForReady(Date.now() + ms, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { loadProto, createClient, waitForReady };
