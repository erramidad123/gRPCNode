"use strict";

const path = require("path");
const { expect } = require("chai");
const { createServer } = require("../src/server");
const {
  loadProto,
  createClient,
  waitForReady,
} = require("./helpers/grpcHelper");
const { useGrpcServer } = require("./helpers/serverLifecycle");

const PROTO_PATH = path.join(__dirname, "../protos/helloworld.proto");

// ---------------------------------------------------------------------------
// Suite: Greeter Service
// ---------------------------------------------------------------------------
// useGrpcServer registers before/after Mocha hooks that:
//   1. Start a real gRPC server on a random free port before the suite runs.
//   2. Gracefully shut it down after all tests finish.
// ---------------------------------------------------------------------------
describe("Greeter Service", function () {
  const lifecycle = useGrpcServer(createServer);
  let client;

  // Build the client once the server is up (port is available in a nested before).
  before(async function () {
    this.timeout(5000);
    const proto = loadProto(PROTO_PATH);
    client = createClient(proto.helloworld.Greeter, lifecycle.getAddress());
    await waitForReady(client);
  });

  // -------------------------------------------------------------------------
  describe("SayHello", function () {
    it("returns a greeting for a valid name", async function () {
      const res = await client.sayHello({ name: "World" });
      console.log("[SayHello] response:", res);
      expect(res).to.have.property("message", "Hello, World!");
    });

    it("returns a greeting when name is an empty string", async function () {
      const res = await client.sayHello({ name: "" });
      console.log("[SayHello] response:", res);
      expect(res.message).to.equal("Hello, j!");
    });

    it("handles names with special characters", async function () {
      const res = await client.sayHello({ name: "Alice & Bob" });
      console.log("[SayHello] response:", res);
      expect(res.message).to.equal("Hello, Alice & Bob!");
    });
  });

  // -------------------------------------------------------------------------
  describe("SayHelloAgain", function () {
    it("returns a second distinct greeting", async function () {
      const res = await client.sayHelloAgain({ name: "World" });
      console.log("[SayHelloAgain] response:", res);
      expect(res).to.have.property("message", "Hello again, World!");
    });

    it("is independent from SayHello", async function () {
      const [first, second] = await Promise.all([
        client.sayHello({ name: "Test" }),
        client.sayHelloAgain({ name: "Test" }),
      ]);
      console.log("[SayHello] response:", first);
      console.log("[SayHelloAgain] response:", second);
      expect(first.message).to.not.equal(second.message);
    });
  });
});
