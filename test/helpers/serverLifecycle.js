"use strict";

const grpc = require("@grpc/grpc-js");

/**
 * Register Mocha before/after hooks that spin up a gRPC server on a
 * randomly-assigned port before the suite runs and shut it down cleanly
 * after all tests have finished.
 *
 * Usage inside a describe block:
 *
 *   const lifecycle = useGrpcServer(createServer);
 *   // later: `lifecycle.getPort()` → the port chosen by the OS
 *
 * @param {Function} serverFactory  - Zero-argument function that returns a
 *                                    configured (but not yet bound) grpc.Server.
 * @param {string|number} [port=0]  - Port to bind. Defaults to 0 so the OS
 *                                    picks a free port automatically.
 * @returns {{ getPort: () => number, getServer: () => grpc.Server }}
 */
function useGrpcServer(serverFactory, port = 0) {
  let server;
  let boundPort;

  before(function (done) {
    this.timeout(10000);
    server = serverFactory();
    server.bindAsync(
      `127.0.0.1:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, assignedPort) => {
        if (err) return done(err);
        boundPort = assignedPort;
        done();
      },
    );
  });

  after(function (done) {
    this.timeout(5000);
    server.tryShutdown(done);
  });

  return {
    /** Returns the port the server was actually bound to. */
    getPort: () => boundPort,
    /** Returns the host:port string to use in client connections. */
    getAddress: () => `127.0.0.1:${boundPort}`,
    /** Returns the raw grpc.Server instance. */
    getServer: () => server,
  };
}

module.exports = { useGrpcServer };
