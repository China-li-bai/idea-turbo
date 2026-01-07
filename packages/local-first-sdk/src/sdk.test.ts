import { LocalFirstSDK } from "../src/sdk";
import { SyncEngine } from "../src/core";
import { PersistenceManager } from "../src/persistence";
import { NetworkManager } from "../src/network";

describe("LocalFirstSDK", () => {
  it("should initialize SDK", async () => {
    const sdk = new LocalFirstSDK({
      room: "test-room",
    });

    expect(sdk).toBeInstanceOf(LocalFirstSDK);
    expect(sdk.getEngine()).toBeInstanceOf(SyncEngine);
    expect(sdk.getPersistence()).toBeInstanceOf(PersistenceManager);
    expect(sdk.getNetwork()).toBeInstanceOf(NetworkManager);

    sdk.destroy();
  });

  it("should manage user presence", () => {
    const sdk = new LocalFirstSDK({
      room: "test-room",
    });

    sdk.setUserPresence({
      name: "Test User",
      color: "red",
    });

    const presence = sdk.getUserPresence();
    expect(presence).toEqual({
      name: "Test User",
      color: "red",
    });

    sdk.destroy();
  });
});
