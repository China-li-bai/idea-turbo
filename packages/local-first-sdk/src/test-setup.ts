import FDBFactory from "fake-indexeddb";

global.indexedDB = new FDBFactory();
