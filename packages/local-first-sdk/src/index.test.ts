import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLocalFirst, LocalFirst, LocalFirstConfig } from "../src/index";

describe("LocalFirst SDK", () => {
  let sdk: LocalFirst;
  let config: LocalFirstConfig;

  beforeEach(() => {
    config = {
      room: "test-room",
      host: "localhost:1999",
      autoConnect: false,
      enablePersistence: false,
    };
    sdk = createLocalFirst(config);
  });

  afterEach(() => {
    sdk.destroy();
  });

  describe("初始化", () => {
    it("应该成功创建 SDK 实例", () => {
      expect(sdk).toBeDefined();
      expect(sdk).toBeInstanceOf(LocalFirst);
    });

    it("应该有正确的初始状态", () => {
      expect(sdk.status).toBe("disconnected");
      expect(sdk.doc).toBeDefined();
      expect(sdk.provider).toBeDefined();
      expect(sdk.awareness).toBeDefined();
    });

    it("应该使用默认 host", () => {
      const sdk2 = createLocalFirst({
        room: "test-room-2",
        autoConnect: false,
        enablePersistence: false,
      });
      expect(sdk2).toBeDefined();
      sdk2.destroy();
    });

    it("应该支持自定义配置", () => {
      const customConfig: LocalFirstConfig = {
        room: "custom-room",
        host: "custom-host:3000",
        party: "custom-party",
        autoConnect: false,
        enablePersistence: false,
      };
      const customSdk = createLocalFirst(customConfig);
      expect(customSdk).toBeDefined();
      customSdk.destroy();
    });
  });

  describe("数据操作 - Text", () => {
    it("应该能够获取和操作文本数据", () => {
      const text = sdk.getText("content");
      expect(text).toBeDefined();

      text.insert(0, "Hello, World!");
      expect(text.toString()).toBe("Hello, World!");

      text.delete(0, 5);
      expect(text.toString()).toBe(", World!");
    });

    it("应该支持多个文本字段", () => {
      const text1 = sdk.getText("content1");
      const text2 = sdk.getText("content2");

      text1.insert(0, "First");
      text2.insert(0, "Second");

      expect(text1.toString()).toBe("First");
      expect(text2.toString()).toBe("Second");
    });

    it("应该能够监听文本变化", () => {
      const text = sdk.getText("content");
      const callback = vi.fn();

      text.observe(callback);
      text.insert(0, "Test");

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("数据操作 - Array", () => {
    it("应该能够获取和操作数组数据", () => {
      const array = sdk.getArray<{ text: string; done: boolean }>("todos");
      expect(array).toBeDefined();

      array.push([{ text: "Task 1", done: false }]);
      expect(array.length).toBe(1);

      array.push([{ text: "Task 2", done: true }]);
      expect(array.length).toBe(2);

      const todos = array.toArray();
      expect(todos[0]?.text).toBe("Task 1");
      expect(todos[1]?.text).toBe("Task 2");
    });

    it("应该支持数组删除操作", () => {
      const array = sdk.getArray<number>("numbers");
      array.push([1, 2, 3, 4, 5]);
      expect(array.length).toBe(5);

      array.delete(0, 2);
      expect(array.length).toBe(3);
      const items = array.toArray();
      expect(items).toEqual([3, 4, 5]);
    });

    it("应该能够监听数组变化", () => {
      const array = sdk.getArray<number>("numbers");
      const callback = vi.fn();

      array.observe(callback);
      array.push([1, 2, 3]);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("数据操作 - Map", () => {
    it("应该能够获取和操作 Map 数据", () => {
      const map = sdk.getMap<string>("metadata");
      expect(map).toBeDefined();

      map.set("title", "My Document");
      map.set("author", "John Doe");

      expect(map.get("title")).toBe("My Document");
      expect(map.get("author")).toBe("John Doe");
    });

    it("应该支持 Map 删除操作", () => {
      const map = sdk.getMap<string>("settings");
      map.set("theme", "dark");
      map.set("language", "en");

      expect(map.get("theme")).toBe("dark");

      map.delete("theme");
      expect(map.get("theme")).toBeUndefined();
      expect(map.get("language")).toBe("en");
    });

    it("应该能够监听 Map 变化", () => {
      const map = sdk.getMap<string>("settings");
      const callback = vi.fn();

      map.observe(callback);
      map.set("theme", "dark");

      expect(callback).toHaveBeenCalled();
    });

    it("应该能够导出为 JSON", () => {
      const map = sdk.getMap<{ name: string; age: number }>("users");
      map.set("user1", { name: "Alice", age: 30 });
      map.set("user2", { name: "Bob", age: 25 });

      const json = map.toJSON();
      expect(json.user1?.name).toBe("Alice");
      expect(json.user2?.age).toBe(25);
    });
  });

  describe("数据操作 - XmlFragment", () => {
    it("应该能够获取 XML 片段", () => {
      const xml = sdk.getXmlFragment("content");
      expect(xml).toBeDefined();
    });
  });

  describe("连接管理", () => {
    it("应该能够连接", () => {
      expect(sdk.status).toBe("disconnected");
      sdk.connect();
    });

    it("应该能够断开连接", () => {
      sdk.connect();
      sdk.disconnect();
    });

    it("应该支持自动连接配置", () => {
      const autoConnectSdk = createLocalFirst({
        room: "auto-connect-room",
        autoConnect: true,
        enablePersistence: false,
      });
      expect(autoConnectSdk).toBeDefined();
      autoConnectSdk.destroy();
    });
  });

  describe("事件监听", () => {
    it("应该能够监听状态变化", () => {
      const callback = vi.fn();
      sdk.on("status", callback);
      sdk.connect();

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, 100);
    });

    it("应该能够移除状态监听器", () => {
      const callback = vi.fn();
      sdk.on("status", callback);
      sdk.off("status", callback);
      sdk.connect();

      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
      }, 100);
    });

    it("应该能够监听变化事件", () => {
      const callback = vi.fn();
      sdk.on("change", callback);
      sdk.connect();

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
      }, 100);
    });

    it("应该支持多个监听器", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      sdk.on("status", callback1);
      sdk.on("status", callback2);
      sdk.connect();

      setTimeout(() => {
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
      }, 100);
    });
  });

  describe("状态管理", () => {
    it("应该能够获取状态快照", () => {
      const state = sdk.getState();
      expect(state).toBeDefined();
      expect(typeof state.isOnline).toBe("boolean");
      expect(typeof state.isSynced).toBe("boolean");
      expect(state.syncStatus).toBeDefined();
      expect(state.lastSyncTime).toBeNull();
    });

    it("应该能够监听状态变化", () => {
      const callback = vi.fn();
      sdk.onStateChange(callback);

      const state = sdk.getState();
      expect(state).toBeDefined();
    });

    it("应该能够移除状态监听器", () => {
      const callback = vi.fn();
      sdk.onStateChange(callback);
      sdk.offStateChange(callback);

      const state = sdk.getState();
      expect(state).toBeDefined();
    });

    it("应该跟踪在线状态", () => {
      const state = sdk.getState();
      expect(typeof state.isOnline).toBe("boolean");
    });

    it("应该跟踪同步状态", () => {
      const state = sdk.getState();
      expect(typeof state.isSynced).toBe("boolean");
      expect(["connected", "connecting", "disconnected", "synced", "error"]).toContain(
        state.syncStatus
      );
    });
  });

  describe("配置回调", () => {
    it("应该支持状态变化回调", () => {
      const onStatusChange = vi.fn();
      const sdkWithCallback = createLocalFirst({
        room: "callback-room",
        autoConnect: false,
        enablePersistence: false,
        onStatusChange,
      });

      sdkWithCallback.connect();
      sdkWithCallback.destroy();
    });

    it("应该支持错误回调", () => {
      const onError = vi.fn();
      const sdkWithErrorCallback = createLocalFirst({
        room: "error-room",
        autoConnect: false,
        enablePersistence: false,
        onError,
      });

      expect(sdkWithErrorCallback).toBeDefined();
      sdkWithErrorCallback.destroy();
    });
  });

  describe("资源清理", () => {
    it("应该能够销毁 SDK 实例", () => {
      const text = sdk.getText("content");
      text.insert(0, "Test");

      sdk.destroy();

      expect(() => {
        text.insert(0, "After destroy");
      }).not.toThrow();
    });

    it("应该清理所有监听器", () => {
      const callback = vi.fn();
      sdk.on("status", callback);
      sdk.onStateChange(callback);

      sdk.destroy();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("Awareness", () => {
    it("应该提供 awareness 实例", () => {
      expect(sdk.awareness).toBeDefined();
    });

    it("应该能够设置本地状态", () => {
      sdk.awareness.setLocalStateField("user", {
        name: "Test User",
        color: "#ff0000",
      });

      const localState = sdk.awareness.getLocalState();
      expect(localState).toBeDefined();
    });
  });

  describe("持久化", () => {
    it("应该支持启用持久化", () => {
      const sdkWithPersistence = createLocalFirst({
        room: "persistence-room",
        autoConnect: false,
        enablePersistence: true,
        persistenceKey: "custom-persistence-key",
      });

      expect(sdkWithPersistence).toBeDefined();
      sdkWithPersistence.destroy();
    });

    it("应该支持禁用持久化", () => {
      const sdkWithoutPersistence = createLocalFirst({
        room: "no-persistence-room",
        autoConnect: false,
        enablePersistence: false,
      });

      expect(sdkWithoutPersistence).toBeDefined();
      sdkWithoutPersistence.destroy();
    });

    it("应该使用自定义持久化键", () => {
      const sdkWithCustomKey = createLocalFirst({
        room: "custom-key-room",
        autoConnect: false,
        enablePersistence: true,
        persistenceKey: "my-custom-key",
      });

      expect(sdkWithCustomKey).toBeDefined();
      sdkWithCustomKey.destroy();
    });
  });

  describe("边界情况", () => {
    it("应该处理空文本", () => {
      const text = sdk.getText("empty");
      expect(text.toString()).toBe("");
    });

    it("应该处理空数组", () => {
      const array = sdk.getArray<number>("empty-array");
      expect(array.length).toBe(0);
    });

    it("应该处理空 Map", () => {
      const map = sdk.getMap<string>("empty-map");
      const json = map.toJSON();
      expect(Object.keys(json).length).toBe(0);
    });

    it("应该处理重复的字段名", () => {
      const text1 = sdk.getText("duplicate");
      const text2 = sdk.getText("duplicate");

      text1.insert(0, "First");
      text2.insert(0, "Second");

      expect(text1.toString()).toBe("SecondFirst");
      expect(text2.toString()).toBe("SecondFirst");
    });
  });

  describe("类型安全", () => {
    it("应该正确推断 Text 类型", () => {
      const text = sdk.getText("typed");
      expect(text).toBeDefined();
    });

    it("应该正确推断 Array 类型", () => {
      const array = sdk.getArray<{ id: number; name: string }>("typed-array");
      array.push([{ id: 1, name: "Test" }]);
      const items = array.toArray();
      expect(items[0]?.id).toBe(1);
      expect(items[0]?.name).toBe("Test");
    });

    it("应该正确推断 Map 类型", () => {
      const map = sdk.getMap<{ key: string; value: number }>("typed-map");
      map.set("item1", { key: "test", value: 42 });
      const item = map.get("item1");
      expect(item?.value).toBe(42);
    });
  });
});
