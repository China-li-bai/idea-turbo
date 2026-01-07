import { createLocalFirst } from "../src/index";

async function basicExample() {
  const sdk = createLocalFirst({
    room: "example-room",
    host: "localhost:1999",
    enablePersistence: true,
  });

  const text = sdk.getText("content");
  text.insert(0, "Hello, Local-First World!");

  console.log("Content:", text.toString());

  sdk.connect();

  sdk.on("status", (status) => {
    console.log("Sync status:", status);
  });

  sdk.onStateChange((state) => {
    console.log("State:", state);
  });
}

async function arrayExample() {
  const sdk = createLocalFirst({
    room: "array-example",
  });

  const todos = sdk.getArray<{ text: string; done: boolean }>("todos");

  todos.push([
    { text: "Learn Local-First SDK", done: false },
    { text: "Build collaborative app", done: false },
  ]);

  todos.observe(() => {
    console.log("Todos:", todos.toArray());
  });

  sdk.connect();
}

async function mapExample() {
  const sdk = createLocalFirst({
    room: "map-example",
  });

  const metadata = sdk.getMap<{
    title: string;
    author: string;
    createdAt: Date;
  }>("metadata");

  metadata.set("title", "My Document");
  metadata.set("author", "John Doe");
  metadata.set("createdAt", new Date());

  metadata.observe(() => {
    console.log("Metadata:", metadata.toJSON());
  });

  sdk.connect();
}

async function manualConnectionExample() {
  const sdk = createLocalFirst({
    room: "manual-connection",
    autoConnect: false,
  });

  const text = sdk.getText("content");
  text.insert(0, "Manual connection example");

  console.log("Current status:", sdk.status);

  sdk.connect();

  setTimeout(() => {
    console.log("Disconnecting...");
    sdk.disconnect();
  }, 5000);

  setTimeout(() => {
    console.log("Reconnecting...");
    sdk.connect();
  }, 10000);
}

async function errorHandlingExample() {
  const sdk = createLocalFirst({
    room: "error-handling",
    onStatusChange: (status) => {
      console.log("Status changed:", status);
    },
    onError: (error) => {
      console.error("Error occurred:", error.message);
    },
  });

  sdk.connect();

  sdk.on("status", (status) => {
    if (status === "error") {
      console.log("Connection error - will retry");
    }
  });
}

async function stateMonitoringExample() {
  const sdk = createLocalFirst({
    room: "state-monitoring",
  });

  sdk.onStateChange((state) => {
    console.log("=== State Update ===");
    console.log("Online:", state.isOnline);
    console.log("Synced:", state.isSynced);
    console.log("Sync status:", state.syncStatus);
    console.log("Last sync:", state.lastSyncTime);
    console.log("==================");
  });

  sdk.connect();
}

async function awarenessExample() {
  const sdk = createLocalFirst({
    room: "awareness-example",
  });

  sdk.awareness.setLocalStateField("user", {
    name: "Alice",
    color: "#ff0000",
  });

  sdk.awareness.on("change", () => {
    const states = Array.from(sdk.awareness.getStates().values());
    console.log("Online users:", states);
  });

  sdk.connect();
}

async function advancedUsageExample() {
  const sdk = createLocalFirst({
    room: "advanced-usage",
  });

  // Access underlying Yjs document
  const doc = sdk.doc;
  console.log("Yjs document:", doc);

  // Access underlying provider
  const provider = sdk.provider;
  console.log("Provider:", provider);

  // Access awareness
  const awareness = sdk.awareness;
  console.log("Awareness:", awareness);

  // Use Yjs features directly
  const customMap = doc.getMap("custom");
  customMap.set("key", "value");

  sdk.connect();
}

async function runAllExamples() {
  console.log("=== Basic Example ===");
  await basicExample();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n=== Array Example ===");
  await arrayExample();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n=== Map Example ===");
  await mapExample();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n=== Manual Connection Example ===");
  await manualConnectionExample();
  await new Promise((resolve) => setTimeout(resolve, 15000));

  console.log("\n=== Error Handling Example ===");
  await errorHandlingExample();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n=== State Monitoring Example ===");
  await stateMonitoringExample();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n=== Awareness Example ===");
  await awarenessExample();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n=== Advanced Usage Example ===");
  await advancedUsageExample();
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n=== All examples completed ===");
}

if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicExample,
  arrayExample,
  mapExample,
  manualConnectionExample,
  errorHandlingExample,
  stateMonitoringExample,
  awarenessExample,
  advancedUsageExample,
};
