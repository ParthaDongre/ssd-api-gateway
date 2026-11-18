const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  getClient,
  USERS_TABLE,
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

class UserQuery {
  constructor(queryPromise) {
    this.queryPromise = queryPromise;
  }

  select() {
    return this;
  }

  then(resolve, reject) {
    return this.queryPromise.then(resolve, reject);
  }

  catch(reject) {
    return this.queryPromise.catch(reject);
  }
}

class User {
  constructor(data = {}) {
    this.id = data.id || data._id || uuidv4();
    this.username = data.username ? data.username.trim().toLowerCase() : "";
    this.email = data.email ? data.email.trim().toLowerCase() : "";
    this.password = data.password || "";
    this.name = data.name ? data.name.trim() : this.username;
    this.department = data.department ? data.department.trim() : "Computer Engineering";
    this.role = data.role || "user";
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get _id() {
    return this.id;
  }

  async comparePassword(candidatePassword) {
    if (!this.password || !candidatePassword) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      name: this.name,
      department: this.department,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  async save() {
    // Hash password if not already hashed with bcrypt ($2a$ or $2b$)
    if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    this.updatedAt = new Date().toISOString();

    const { docClient, isUsingCloud } = getClient();

    const userData = {
      id: this.id,
      username: this.username,
      email: this.email,
      password: this.password,
      name: this.name,
      department: this.department,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    if (isUsingCloud && docClient) {
      try {
        await docClient.send(
          new PutCommand({
            TableName: USERS_TABLE,
            Item: userData
          })
        );
      } catch (err) {
        disableCloudMode(err);
      }
    }

    // Always mirror to memoryStore & local disk so data is never lost if cloud disconnects
    memoryStore.users.set(this.id, userData);
    saveToDisk();

    return this;
  }

  static findById(id) {
    const doFind = async () => {
      if (!id) return null;
      const targetId = String(id);
      const { docClient, isUsingCloud } = getClient();

      if (isUsingCloud && docClient) {
        try {
          const res = await docClient.send(
            new GetCommand({
              TableName: USERS_TABLE,
              Key: { id: targetId }
            })
          );
          if (res.Item) return new User(res.Item);
        } catch (err) {
          disableCloudMode(err);
        }
      }

      loadFromDisk();
      const item = memoryStore.users.get(targetId);
      if (!item) return null;
      return new User(item);
    };
    return new UserQuery(doFind());
  }

  static findOne(query = {}) {
    const doFind = async () => {
      const { docClient, isUsingCloud } = getClient();

      // Query support for: { $or: [{ username }, { email }] } or { username } or { id }
      if (query.$or && Array.isArray(query.$or)) {
        for (const cond of query.$or) {
          const found = await User.findOne(cond);
          if (found) return found;
        }
        return null;
      }

      if (query.id || query._id) {
        return User.findById(query.id || query._id);
      }

      const username = query.username ? query.username.trim().toLowerCase() : null;
      const email = query.email ? query.email.trim().toLowerCase() : null;

      if (isUsingCloud && docClient) {
        try {
          if (username) {
            try {
              const res = await docClient.send(
                new QueryCommand({
                  TableName: USERS_TABLE,
                  IndexName: "username-index",
                  KeyConditionExpression: "username = :u",
                  ExpressionAttributeValues: { ":u": username }
                })
              );
              if (res.Items && res.Items.length > 0) {
                return new User(res.Items[0]);
              }
            } catch {
              const scanRes = await docClient.send(
                new ScanCommand({
                  TableName: USERS_TABLE,
                  FilterExpression: "username = :u",
                  ExpressionAttributeValues: { ":u": username }
                })
              );
              if (scanRes.Items && scanRes.Items.length > 0) {
                return new User(scanRes.Items[0]);
              }
            }
          }

          if (email) {
            try {
              const res = await docClient.send(
                new QueryCommand({
                  TableName: USERS_TABLE,
                  IndexName: "email-index",
                  KeyConditionExpression: "email = :e",
                  ExpressionAttributeValues: { ":e": email }
                })
              );
              if (res.Items && res.Items.length > 0) {
                return new User(res.Items[0]);
              }
            } catch {
              const scanRes = await docClient.send(
                new ScanCommand({
                  TableName: USERS_TABLE,
                  FilterExpression: "email = :e",
                  ExpressionAttributeValues: { ":e": email }
                })
              );
              if (scanRes.Items && scanRes.Items.length > 0) {
                return new User(scanRes.Items[0]);
              }
            }
          }
        } catch (err) {
          disableCloudMode(err);
        }
      }

      loadFromDisk();
      for (const item of memoryStore.users.values()) {
        if (username && item.username === username) return new User(item);
        if (email && item.email === email) return new User(item);
      }
      return null;
    };
    return new UserQuery(doFind());
  }

  static async countDocuments() {
    const { docClient, isUsingCloud } = getClient();
    if (isUsingCloud && docClient) {
      const res = await docClient.send(new ScanCommand({ TableName: USERS_TABLE, Select: "COUNT" }));
      return res.Count || 0;
    }
    loadFromDisk();
    return memoryStore.users.size;
  }

  static async deleteMany(query = {}) {
    const { docClient, isUsingCloud } = getClient();
    if (isUsingCloud && docClient) {
      const res = await docClient.send(new ScanCommand({ TableName: USERS_TABLE, ProjectionExpression: "id" }));
      if (res.Items) {
        for (const item of res.Items) {
          await docClient.send(new DeleteCommand({ TableName: USERS_TABLE, Key: { id: item.id } }));
        }
      }
    } else {
      memoryStore.users.clear();
      saveToDisk();
    }
    return { acknowledged: true };
  }
}

User.prototype.select = function () {
  return this;
};

module.exports = User;
