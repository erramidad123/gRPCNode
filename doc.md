# gRPC Mocha Testing Framework

A lightweight, zero-boilerplate framework for writing integration tests against
gRPC services using **Mocha** and **Chai**. The server spins up on a random free
port before each suite and shuts down cleanly after — no manual port management,
no leftover processes.

---

## Table of Contents

1. [What the Framework Does](#1-what-the-framework-does)
2. [Project Structure](#2-project-structure)
3. [Dependencies](#3-dependencies)
4. [Quick Start](#4-quick-start)
5. [The Proto File](#5-the-proto-file)
   - 5.1 [Proto3 Syntax Basics](#51-proto3-syntax-basics)
   - 5.2 [Defining a Service](#52-defining-a-service)
   - 5.3 [Defining Messages](#53-defining-messages)
   - 5.4 [Loading a Proto at Runtime](#54-loading-a-proto-at-runtime)
6. [The gRPC Server](#6-the-grpc-server)
   - 6.1 [How the Server Works](#61-how-the-server-works)
   - 6.2 [RPC Handler Signature](#62-rpc-handler-signature)
   - 6.3 [createServer vs startServer](#63-createserver-vs-startserver)
   - 6.4 [Running the Server Standalone](#64-running-the-server-standalone)
7. [Test Helpers](#7-test-helpers)
   - 7.1 [grpcHelper — loadProto](#71-grpchelper--loadproto)
   - 7.2 [grpcHelper — createClient](#72-grpchelper--createclient)
   - 7.3 [grpcHelper — waitForReady](#73-grpchelper--waitforready)
   - 7.4 [serverLifecycle — useGrpcServer](#74-serverlifecycle--usegrpcserver)
8. [Connecting a Client to the Server](#8-connecting-a-client-to-the-server)
9. [Writing Tests](#9-writing-tests)
   - 9.1 [Test File Anatomy](#91-test-file-anatomy)
   - 9.2 [Asserting Responses](#92-asserting-responses)
   - 9.3 [Testing Errors and Status Codes](#93-testing-errors-and-status-codes)
10. [Adding a New Service](#10-adding-a-new-service)
11. [Configuration](#11-configuration)
12. [NPM Scripts](#12-npm-scripts)
13. [Architecture Diagram](#13-architecture-diagram)

---

## 1. What the Framework Does

gRPC services communicate over HTTP/2 using binary-encoded Protocol Buffer
messages. Testing them requires:

- A running gRPC server with real service implementations.
- A matching gRPC client that can call each RPC.
- Lifecycle management so the server starts before tests and stops after.

This framework handles all three concerns:

| Concern           | Solution                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| Server lifecycle  | `useGrpcServer()` registers Mocha `before`/`after` hooks automatically       |
| Port conflicts    | Server binds to port `0`; the OS picks a free port                           |
| Async RPC calls   | `createClient()` wraps every method with `promisify` so you can `await` them |
| Proto loading     | `loadProto()` normalises all loader options in one place                     |
| Channel readiness | `waitForReady()` blocks until the TCP connection is established              |

---

## 2. Project Structure

```
mocha/
├── .mocharc.yml                  # Mocha configuration
├── package.json                  # Dependencies and npm scripts
│
├── protos/
│   └── helloworld.proto          # Protocol Buffer service definition
│
├── src/
│   └── server.js                 # gRPC server implementation
│
└── test/
    ├── helpers/
    │   ├── grpcHelper.js         # loadProto / createClient / waitForReady
    │   └── serverLifecycle.js    # useGrpcServer() Mocha lifecycle hook
    └── helloworld.test.js        # Example test suite
```

---

## 3. Dependencies

| Package              | Role                                                    |
| -------------------- | ------------------------------------------------------- |
| `@grpc/grpc-js`      | Pure-JS gRPC implementation (server + client)           |
| `@grpc/proto-loader` | Loads `.proto` files at runtime without code generation |
| `mocha` _(dev)_      | Test runner                                             |
| `chai` _(dev)_       | BDD assertion library                                   |

Install with:

```bash
npm install
```

---

## 4. Quick Start

```bash
# Install dependencies
npm install

# Run the test suite
npm test

# Run tests in watch mode (re-runs on file save)
npm run test:watch

# Start the server standalone on port 50051
npm run start:server
```

Expected output:

```
  Greeter Service
    SayHello
      ✔ returns a greeting for a valid name
      ✔ returns a greeting when name is an empty string
      ✔ handles names with special characters
    SayHelloAgain
      ✔ returns a second distinct greeting
      ✔ is independent from SayHello

  5 passing (74ms)
```

---

## 5. The Proto File

**File:** `protos/helloworld.proto`

Protocol Buffers (Protobuf) is the Interface Definition Language (IDL) used by
gRPC. The `.proto` file is the single source of truth for every service: it
defines the RPC methods, the request shape, and the response shape. Both the
server and client are generated from (or loaded against) the same `.proto` file,
guaranteeing they speak the same language.

### 5.1 Proto3 Syntax Basics

```proto
syntax = "proto3";
```

- `proto3` is the current version of the language.
- Fields are optional by default and have zero-values when absent.
- Field numbers (e.g. `= 1`) identify fields in the binary encoding and must
  never change once in production.

### 5.2 Defining a Service

```proto
service Greeter {
  rpc SayHello     (HelloRequest) returns (HelloReply);
  rpc SayHelloAgain(HelloRequest) returns (HelloReply);
}
```

- `service` declares a named group of RPC methods.
- Each `rpc` line defines one method: its name, the message type it accepts, and
  the message type it returns.
- The example uses **unary** RPCs (one request → one response). gRPC also
  supports server streaming, client streaming, and bidirectional streaming.

### 5.3 Defining Messages

```proto
message HelloRequest {
  string name = 1;   // field name, type, and unique number
}

message HelloReply {
  string message = 1;
}
```

- `message` is analogous to a class or struct.
- Supported scalar types: `string`, `bool`, `int32`, `int64`, `float`,
  `double`, `bytes`, and more.
- Nested messages, enums, and repeated fields are all supported.

### 5.4 Loading a Proto at Runtime

Instead of generating JavaScript code from the `.proto` file (`protoc`), this
framework loads the file dynamically using `@grpc/proto-loader`:

```js
const packageDefinition = protoLoader.loadSync("./protos/helloworld.proto", {
  keepCase: true, // preserve field names as written (no camelCase conversion)
  longs: String, // represent int64 values as strings
  enums: String, // represent enums as string names
  defaults: true, // include default values for missing fields
  oneofs: true, // include virtual oneof fields
});

const proto = grpc.loadPackageDefinition(packageDefinition);
// proto.helloworld.Greeter  ← client constructor
// proto.helloworld.Greeter.service ← service descriptor for the server
```

---

## 6. The gRPC Server

**File:** `src/server.js`

### 6.1 How the Server Works

```
┌──────────────────────────────────────────┐
│              grpc.Server                 │
│                                          │
│  addService(descriptor, implementation)  │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  Greeter.service (from proto)    │    │
│  │  ├── SayHello      → sayHello()  │    │
│  │  └── SayHelloAgain → sayHelloAgain() │ │
│  └──────────────────────────────────┘    │
│                                          │
│  bindAsync(address, credentials, cb)     │
└──────────────────────────────────────────┘
```

1. A `grpc.Server` instance is created.
2. The service descriptor (from the proto) is registered together with an
   object mapping each RPC name to a JavaScript handler function.
3. The server is bound to a TCP address with `bindAsync`. The callback receives
   the port that was actually assigned.

### 6.2 RPC Handler Signature

Every unary RPC handler has the same signature:

```js
function sayHello(call, callback) {
  // call.request  → deserialized request message (plain JS object)
  // call.metadata → gRPC metadata sent by the client
  callback(null, { message: `Hello, ${call.request.name}!` });
  //        ↑              ↑
  //        error          response object (serialized to proto)
}
```

To return an error:

```js
function handler(call, callback) {
  const err = {
    code: grpc.status.NOT_FOUND,
    message: "Resource not found",
  };
  callback(err);
}
```

### 6.3 `createServer` vs `startServer`

| Function             | Binds to a port?    | Use when                                      |
| -------------------- | ------------------- | --------------------------------------------- |
| `createServer()`     | No                  | Tests — lets `useGrpcServer` pick a free port |
| `startServer(port?)` | Yes (default 50051) | Running the server as a standalone process    |

```js
const { createServer, startServer } = require("./src/server");

// For tests:
const server = createServer(); // configured but not yet bound

// For production / manual use:
startServer(50051); // bound and running immediately
```

### 6.4 Running the Server Standalone

```bash
npm run start:server
# → gRPC server listening on port 50051
```

Or pass a custom port:

```bash
node src/server.js 8080
```

---

## 7. Test Helpers

### 7.1 `grpcHelper` — `loadProto`

**File:** `test/helpers/grpcHelper.js`

```js
const { loadProto } = require("./helpers/grpcHelper");

const proto = loadProto("/absolute/path/to/service.proto");
// proto.<package>.<ServiceName>  → client constructor
```

Wraps `protoLoader.loadSync` + `grpc.loadPackageDefinition` with consistent
default options. You can override any option:

```js
const proto = loadProto(PROTO_PATH, { keepCase: false });
```

---

### 7.2 `grpcHelper` — `createClient`

```js
const { createClient } = require("./helpers/grpcHelper");

const client = createClient(
  proto.helloworld.Greeter, // service client class from the proto
  "127.0.0.1:50051", // address of the server
  // optional: grpc.credentials.createSsl(...)
);
```

Returns a plain object with:

| Property       | Type             | Description                         |
| -------------- | ---------------- | ----------------------------------- |
| `raw`          | `grpc.Client`    | The underlying gRPC client instance |
| `<methodName>` | `async Function` | One promisified method per RPC      |

Example:

```js
// Callback-based (raw):
client.raw.sayHello({ name: 'World' }, (err, res) => { ... });

// Promise-based (preferred in tests):
const res = await client.sayHello({ name: 'World' });
console.log(res.message); // "Hello, World!"
```

**How promisification works:**  
`createClient` iterates over the prototype of the gRPC client and calls
`util.promisify` on every function it finds. This converts Node.js
callback-style methods — `fn(request, callback)` — into Promise-returning
functions — `fn(request) → Promise<response>`.

---

### 7.3 `grpcHelper` — `waitForReady`

```js
await waitForReady(client); // default 5 000 ms deadline
await waitForReady(client, 10_000); // custom deadline
```

gRPC clients connect lazily — just calling `new ServiceClient(address, creds)`
does not open a TCP connection. `waitForReady` blocks until the channel state
transitions to `READY` (connection established and handshake complete) or throws
if the deadline passes.

**Always call `waitForReady` in a `before` hook before running any test.**

---

### 7.4 `serverLifecycle` — `useGrpcServer`

**File:** `test/helpers/serverLifecycle.js`

```js
const { useGrpcServer } = require("./helpers/serverLifecycle");

describe("My Service", function () {
  const lifecycle = useGrpcServer(createServer);
  //                              ↑
  //   zero-argument factory that returns an unbound grpc.Server

  // lifecycle.getPort()    → number — OS-assigned port
  // lifecycle.getAddress() → string — "127.0.0.1:<port>"
  // lifecycle.getServer()  → grpc.Server instance
});
```

Internally, `useGrpcServer` registers two Mocha hooks:

```
before()  → serverFactory() → bindAsync("127.0.0.1:0", ...)
               ↓
           OS assigns a free port, stored in boundPort
               ↓
           done() — Mocha continues to the tests

after()   → server.tryShutdown(done)
               ↓
           Drains in-flight RPCs, closes listeners
               ↓
           done() — Mocha exits cleanly
```

**Why port `0`?**  
Passing `0` as the port tells the operating system to pick any available port.
This prevents test failures caused by port conflicts when multiple test suites
run in the same process or when a previous run did not shut down cleanly.

**Custom port** (use only when an external tool needs a fixed address):

```js
const lifecycle = useGrpcServer(createServer, 50099);
```

---

## 8. Connecting a Client to the Server

The full connection sequence in a test file:

```js
const path = require("path");
const {
  loadProto,
  createClient,
  waitForReady,
} = require("./helpers/grpcHelper");
const { useGrpcServer } = require("./helpers/serverLifecycle");
const { createServer } = require("../src/server");

const PROTO_PATH = path.join(__dirname, "../protos/helloworld.proto");

describe("My Suite", function () {
  // Step 1 — register lifecycle hooks (server starts before any test runs)
  const lifecycle = useGrpcServer(createServer);

  let client;

  // Step 2 — create and connect the client after the server is bound
  before(async function () {
    this.timeout(5000);
    const proto = loadProto(PROTO_PATH); // parse proto
    client = createClient(
      proto.helloworld.Greeter, // build client
      lifecycle.getAddress(),
    ); // 127.0.0.1:<port>
    await waitForReady(client); // await TCP connect
  });

  // Step 3 — use the client in tests
  it("my test", async function () {
    const res = await client.sayHello({ name: "World" });
    // assert res ...
  });
});
```

### Channel Credentials

| Credential           | Code                                                          | Use case                  |
| -------------------- | ------------------------------------------------------------- | ------------------------- |
| Insecure (plaintext) | `grpc.credentials.createInsecure()`                           | Local / test environments |
| TLS                  | `grpc.credentials.createSsl()`                                | Production                |
| TLS + client cert    | `grpc.credentials.createSsl(rootCert, clientKey, clientCert)` | Mutual TLS                |

`createClient` defaults to insecure. Pass custom credentials as the third argument:

```js
const creds = grpc.credentials.createSsl(
  fs.readFileSync("ca.crt"),
  fs.readFileSync("client.key"),
  fs.readFileSync("client.crt"),
);
const client = createClient(proto.mypackage.MyService, "host:443", creds);
```

---

## 9. Writing Tests

### 9.1 Test File Anatomy

```js
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
  //─── 1. Server lifecycle ─────────────────────────────────────────
  const lifecycle = useGrpcServer(createServer);

  //─── 2. Client setup ─────────────────────────────────────────────
  let client;
  before(async function () {
    this.timeout(5000);
    const proto = loadProto(PROTO_PATH);
    client = createClient(proto.helloworld.Greeter, lifecycle.getAddress());
    await waitForReady(client);
  });

  //─── 3. Test cases ───────────────────────────────────────────────
  describe("SayHello", function () {
    it("returns a greeting for a valid name", async function () {
      const res = await client.sayHello({ name: "World" });
      expect(res).to.have.property("message", "Hello, World!");
    });
  });
});
```

### 9.2 Asserting Responses

Use Chai's `expect` API against the plain JS object returned by the RPC:

```js
// Property existence and value
expect(res).to.have.property("message", "Hello, World!");

// String assertions
expect(res.message).to.be.a("string");
expect(res.message).to.include("Hello");

// Deep equality (useful for nested messages)
expect(res).to.deep.equal({ message: "Hello, World!" });

// Numeric fields
expect(res.count).to.be.greaterThan(0);
```

### 9.3 Testing Errors and Status Codes

When a server-side handler returns an error, the promisified call rejects with
an object that has `code` and `message` properties matching gRPC status codes.

```js
it("returns NOT_FOUND for an unknown id", async function () {
  try {
    await client.getItem({ id: "nonexistent" });
    expect.fail("Expected an error to be thrown");
  } catch (err) {
    expect(err).to.have.property("code", grpc.status.NOT_FOUND);
    expect(err.message).to.include("not found");
  }
});
```

Common gRPC status codes:

| Constant                       | Value | Meaning                        |
| ------------------------------ | ----- | ------------------------------ |
| `grpc.status.OK`               | 0     | Success                        |
| `grpc.status.CANCELLED`        | 1     | Client cancelled the request   |
| `grpc.status.INVALID_ARGUMENT` | 3     | Bad request data               |
| `grpc.status.NOT_FOUND`        | 5     | Resource does not exist        |
| `grpc.status.ALREADY_EXISTS`   | 6     | Resource conflict              |
| `grpc.status.UNAUTHENTICATED`  | 16    | Missing or invalid credentials |
| `grpc.status.INTERNAL`         | 13    | Server-side error              |

---

## 10. Adding a New Service

Follow these steps to add a second service to the framework.

**Step 1 — Define the proto**

Create `protos/calculator.proto`:

```proto
syntax = "proto3";
package calculator;

service Calculator {
  rpc Add(AddRequest) returns (AddReply);
}

message AddRequest {
  int32 a = 1;
  int32 b = 2;
}

message AddReply {
  int32 result = 1;
}
```

**Step 2 — Implement the server**

Create `src/calculatorServer.js`:

```js
"use strict";
const grpc = require("@grpc/grpc-js");
const { loadProto } = require("../test/helpers/grpcHelper");
const path = require("path");

const proto = loadProto(path.join(__dirname, "../protos/calculator.proto"));

function add(call, callback) {
  callback(null, { result: call.request.a + call.request.b });
}

function createServer() {
  const server = new grpc.Server();
  server.addService(proto.calculator.Calculator.service, { add });
  return server;
}

module.exports = { createServer };
```

**Step 3 — Write the tests**

Create `test/calculator.test.js`:

```js
"use strict";
const path = require("path");
const { expect } = require("chai");
const { createServer } = require("../src/calculatorServer");
const {
  loadProto,
  createClient,
  waitForReady,
} = require("./helpers/grpcHelper");
const { useGrpcServer } = require("./helpers/serverLifecycle");

const PROTO_PATH = path.join(__dirname, "../protos/calculator.proto");

describe("Calculator Service", function () {
  const lifecycle = useGrpcServer(createServer);
  let client;

  before(async function () {
    this.timeout(5000);
    const proto = loadProto(PROTO_PATH);
    client = createClient(proto.calculator.Calculator, lifecycle.getAddress());
    await waitForReady(client);
  });

  it("adds two integers", async function () {
    const res = await client.add({ a: 3, b: 4 });
    expect(res.result).to.equal(7);
  });
});
```

**Step 4 — Run**

```bash
npm test
```

Mocha picks up `test/**/*.test.js` automatically — no configuration change needed.

---

## 11. Configuration

**File:** `.mocharc.yml`

```yaml
spec: test/**/*.test.js # glob pattern for test files
timeout: 10000 # per-test timeout in milliseconds (10 s)
exit: true # force process exit after all tests finish
```

| Option        | Default             | Description                               |
| ------------- | ------------------- | ----------------------------------------- |
| `spec`        | `test/**/*.test.js` | Glob for test files                       |
| `timeout`     | `10000`             | ms before a test is marked as failed      |
| `exit`        | `true`              | Exit even if async handles are still open |
| `watch-files` | _(inherits spec)_   | Files to watch in `--watch` mode          |

---

## 12. NPM Scripts

| Script                 | Command              | Description                    |
| ---------------------- | -------------------- | ------------------------------ |
| `npm test`             | `mocha`              | Run all tests once             |
| `npm run test:watch`   | `mocha --watch`      | Re-run on file changes         |
| `npm run start:server` | `node src/server.js` | Start the server on port 50051 |

---

## 13. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        npm test                             │
│                           │                                 │
│                    Mocha test runner                        │
│                           │                                 │
│         ┌─────────────────┴──────────────────┐             │
│         │         describe('Suite')           │             │
│         │                                     │             │
│         │  useGrpcServer(createServer)        │             │
│         │         │                           │             │
│         │   before hook                       │             │
│         │    ├── createServer()               │             │
│         │    │    └── new grpc.Server()       │             │
│         │    │         addService(...)        │             │
│         │    └── bindAsync("127.0.0.1:0")     │             │
│         │         └── OS assigns free port    │             │
│         │                                     │             │
│         │  before hook (nested)               │             │
│         │    ├── loadProto(proto file)        │             │
│         │    ├── createClient(ServiceClass,   │             │
│         │    │     address)                   │             │
│         │    └── waitForReady(client)         │             │
│         │         └── TCP handshake complete  │             │
│         │                                     │             │
│         │  it('test 1')                       │             │
│         │    └── await client.sayHello(...)   │             │
│         │         │                           │             │
│         │    ┌────┘  HTTP/2 + Protobuf        │             │
│         │    │                                │             │
│         │  gRPC Server (in-process)           │             │
│         │    └── sayHello handler             │             │
│         │         └── callback(null, reply)   │             │
│         │                                     │             │
│         │  after hook                         │             │
│         │    └── server.tryShutdown()         │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

Both server and client run **in the same Node.js process** during tests. The
gRPC channel uses a real TCP loopback connection (`127.0.0.1`), which means the
full gRPC stack — HTTP/2 framing, Protobuf serialization, and status code
propagation — is exercised on every test call.
