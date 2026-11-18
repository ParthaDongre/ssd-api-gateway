const {
  getClient,
  ORDERS_TABLE,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  DeleteCommand,
  memoryStore,
  saveToDisk,
  loadFromDisk,
  disableCloudMode
} = require("../db/dynamoClient");

class OrderQuery {
  constructor(queryPromise) {
    this.queryPromise = queryPromise;
  }

  sort(sortOptions = {}) {
    this.sortKey = Object.keys(sortOptions)[0];
    this.sortDirection = Object.values(sortOptions)[0]; // 1 for asc, -1 for desc
    return this;
  }

  async then(resolve, reject) {
    try {
      let results = await this.queryPromise;
      if (this.sortKey && Array.isArray(results)) {
        const key = this.sortKey;
        const dir = this.sortDirection === -1 ? -1 : 1;
        results.sort((a, b) => {
          if (a[key] < b[key]) return -1 * dir;
          if (a[key] > b[key]) return 1 * dir;
          return 0;
        });
      }
      return resolve(results);
    } catch (err) {
      if (reject) return reject(err);
      throw err;
    }
  }
}

class Order {
  constructor(data = {}) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.orderId = data.orderId || data.id || `ORD-${Date.now().toString().slice(-6)}-${rand}`;
    this.user = data.user ? String(data.user) : "";
    this.item = data.item ? data.item.trim() : "";
    this.amount = Number(data.amount || 0);
    this.status = data.status || "Processing";
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get id() {
    return this.orderId;
  }

  get _id() {
    return this.orderId;
  }

  get _docId() {
    return this.orderId;
  }

  toJSON() {
    return {
      id: this.orderId,
      orderId: this.orderId,
      user: this.user,
      item: this.item,
      amount: this.amount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  async save() {
    this.updatedAt = new Date().toISOString();
    const { docClient, isUsingCloud } = getClient();

    const orderData = {
      orderId: this.orderId,
      user: this.user,
      item: this.item,
      amount: this.amount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    if (isUsingCloud && docClient) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: ORDERS_TABLE,
            Item: orderData
          })
        );
      } catch (err) {
        disableCloudMode(err);
      }
    }

    // Always mirror to memoryStore & local disk
    memoryStore.orders.set(this.orderId, orderData);
    saveToDisk();

    return this;
  }

  static find(query = {}) {
    const runQuery = async () => {
      const { docClient, isUsingCloud } = getClient();
      const userId = query.user ? String(query.user) : null;

      if (isUsingCloud && docClient) {
        try {
          if (userId) {
            try {
              const res = await docClient.send(
                new QueryCommand({
                  TableName: ORDERS_TABLE,
                  IndexName: "user-index",
                  KeyConditionExpression: "#usr = :u",
                  ExpressionAttributeNames: { "#usr": "user" },
                  ExpressionAttributeValues: { ":u": userId }
                })
              );
              return (res.Items || []).map((it) => new Order(it));
            } catch {
              const scanRes = await docClient.send(
                new ScanCommand({
                  TableName: ORDERS_TABLE,
                  FilterExpression: "#usr = :u",
                  ExpressionAttributeNames: { "#usr": "user" },
                  ExpressionAttributeValues: { ":u": userId }
                })
              );
              return (scanRes.Items || []).map((it) => new Order(it));
            }
          }

          const res = await docClient.send(new ScanCommand({ TableName: ORDERS_TABLE }));
          return (res.Items || []).map((it) => new Order(it));
        } catch (err) {
          disableCloudMode(err);
        }
      }

      loadFromDisk();
      const results = [];
      for (const item of memoryStore.orders.values()) {
        if (!userId || item.user === userId) {
          results.push(new Order(item));
        }
      }
      return results;
    };

    return new OrderQuery(runQuery());
  }

  static async findOne(query = {}) {
    const { docClient, isUsingCloud } = getClient();

    if (query.$or && Array.isArray(query.$or)) {
      for (const cond of query.$or) {
        const found = await Order.findOne(cond);
        if (found) return found;
      }
      return null;
    }

    const orderId = query.orderId || query.id || query._id;

    if (orderId) {
      if (isUsingCloud && docClient) {
        try {
          const res = await docClient.send(
            new GetCommand({
              TableName: ORDERS_TABLE,
              Key: { orderId: String(orderId) }
            })
          );
          if (res.Item) return new Order(res.Item);
        } catch (err) {
          disableCloudMode(err);
        }
      }

      loadFromDisk();
      const item = memoryStore.orders.get(String(orderId));
      if (!item) return null;
      return new Order(item);
    }

    const all = await Order.find(query);
    return all && all.length > 0 ? all[0] : null;
  }

  static async countDocuments(query = {}) {
    const results = await Order.find(query);
    return results ? results.length : 0;
  }

  static async insertMany(items = []) {
    const created = [];
    for (const data of items) {
      const order = new Order(data);
      await order.save();
      created.push(order);
    }
    return created;
  }

  static async deleteMany(query = {}) {
    const { docClient, isUsingCloud } = getClient();
    if (isUsingCloud && docClient) {
      const res = await docClient.send(new ScanCommand({ TableName: ORDERS_TABLE, ProjectionExpression: "orderId" }));
      if (res.Items) {
        for (const item of res.Items) {
          await docClient.send(new DeleteCommand({ TableName: ORDERS_TABLE, Key: { orderId: item.orderId } }));
        }
      }
    } else {
      memoryStore.orders.clear();
      saveToDisk();
    }
    return { acknowledged: true };
  }
}

module.exports = Order;
