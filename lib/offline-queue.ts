import type { Transaction } from "./types";

const QUEUE_KEY = "buffer.outbox.v1";

/** A pending insert waiting for the network to come back. */
export interface QueuedTxn {
  client_uuid: string;
  payload: Omit<Transaction, "id" | "pending">;
}

function read(): QueuedTxn[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: QueuedTxn[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export const outbox = {
  all: read,
  add(item: QueuedTxn) {
    const items = read().filter((q) => q.client_uuid !== item.client_uuid);
    items.push(item);
    write(items);
  },
  remove(client_uuid: string) {
    write(read().filter((q) => q.client_uuid !== client_uuid));
  },
  clear() {
    write([]);
  },
};
