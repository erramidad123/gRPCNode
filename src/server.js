"use strict";

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../protos/helloworld.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const helloProto = grpc.loadPackageDefinition(packageDefinition).helloworld;

// ---------- RPC handlers ----------

function sayHello(call, callback) {
  callback(null, { message: `Hello, ${call.request.name}!` });
}

function sayHelloAgain(call, callback) {
  callback(null, { message: `Hello again, ${call.request.name}!` });
}

// ---------- Server factory ----------

/**
 * Create and configure a gRPC Server without binding it to a port.
 * Useful for tests that need to bind on a dynamic port.
 * @returns {grpc.Server}
 */
function createServer() {
  const server = new grpc.Server();
  server.addService(helloProto.Greeter.service, { sayHello, sayHelloAgain });
  return server;
}

/**
 * Start the server bound to the given port (default 50051).
 * @param {string|number} port
 * @returns {grpc.Server}
 */
function startServer(port = 50051) {
  const server = createServer();
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) throw err;
      console.log(`gRPC server listening on port ${boundPort}`);
    },
  );
  return server;
}

module.exports = { createServer, startServer };

// Start standalone when invoked directly: `node src/server.js`
if (require.main === module) {
  startServer();
}
