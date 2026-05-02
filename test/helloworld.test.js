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

describe("Greeter Service", function () {
  const lifecycle = useGrpcServer(createServer);
  let client;

  before(async function () {
    this.timeout(5000);
    const proto = loadProto(PROTO_PATH);
    client = createClient(proto.helloworld.Greeter, lifecycle.getAddress());
    await waitForReady(client);
  });

  // -------------------------------------------------------------------------
  describe("SayHello", function () {
    // PASSING tests (8)
    it("returns a greeting for a valid name", async function () {
      const res = await client.sayHello({ name: "World" });
      expect(res).to.have.property("message", "Hello, World!");
    });

    it("returns a greeting when name is an empty string", async function () {
      const res = await client.sayHello({ name: "" });
      expect(res.message).to.equal("Hello, !");
    });

    it("handles names with special characters", async function () {
      const res = await client.sayHello({ name: "Alice & Bob" });
      expect(res.message).to.equal("Hello, Alice & Bob!");
    });

    it("handles a numeric string name", async function () {
      const res = await client.sayHello({ name: "42" });
      expect(res.message).to.equal("Hello, 42!");
    });

    it("handles a long name", async function () {
      const name = "A".repeat(100);
      const res = await client.sayHello({ name });
      expect(res.message).to.equal(`Hello, ${name}!`);
    });

    it("handles a name with spaces", async function () {
      const res = await client.sayHello({ name: "John Doe" });
      expect(res.message).to.equal("Hello, John Doe!");
    });

    it("handles a name with unicode characters", async function () {
      const res = await client.sayHello({ name: "héllo" });
      expect(res.message).to.equal("Hello, héllo!");
    });

    it("response contains a message property", async function () {
      const res = await client.sayHello({ name: "Test" });
      expect(res).to.have.property("message");
    });

    // FAILING tests (3)
    it("fails: expects wrong greeting format", async function () {
      const res = await client.sayHello({ name: "World" });
      expect(res.message).to.equal("Hi, World!");
    });

    it("fails: expects message to be empty", async function () {
      const res = await client.sayHello({ name: "World" });
      expect(res.message).to.equal("");
    });

    it("fails: expects wrong property name", async function () {
      const res = await client.sayHello({ name: "World" });
      expect(res).to.have.property("greeting", "Hello, World!");
    });

    // SKIPPED tests (2)
    it.skip("skipped: should handle null name gracefully", async function () {
      const res = await client.sayHello({ name: null });
      expect(res.message).to.be.a("string");
    });

    it.skip("skipped: should support concurrent requests", async function () {
      const requests = Array.from({ length: 5 }, (_, i) =>
        client.sayHello({ name: `User${i}` }),
      );
      const results = await Promise.all(requests);
      results.forEach((res, i) => {
        expect(res.message).to.equal(`Hello, User${i}!`);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("SayHelloAgain", function () {
    // PASSING tests (2)
    it("returns a second distinct greeting", async function () {
      const res = await client.sayHelloAgain({ name: "World" });
      expect(res).to.have.property("message", "Hello again, World!");
    });

    it("is independent from SayHello", async function () {
      const [first, second] = await Promise.all([
        client.sayHello({ name: "Test" }),
        client.sayHelloAgain({ name: "Test" }),
      ]);
      expect(first.message).to.not.equal(second.message);
    });
  });
});

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
      expect(res.message).to.equal("Hello, !");
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
