"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
let exports = {};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = void 0;
var bridg_config_1 = require("./bridg.config");
var exec = function (request, subscriptionCallback) {
  if (!bridg_config_1.default.apiIsWebsocket) {
    return fetch(bridg_config_1.default.api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then(function (res) {
      return __awaiter(void 0, void 0, void 0, function () {
        var json;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [4 /*yield*/, res.json()];
            case 1:
              json = _a.sent();
              if (res.status !== 200)
                throw new Error(
                  (json === null || json === void 0 ? void 0 : json.error) || ""
                );
              return [2 /*return*/, json];
          }
        });
      });
    });
  } else {
    return request.func === "subscribe" && subscriptionCallback
      ? websocketListener(request, subscriptionCallback)
      : websocketPromiseReq(request);
  }
};
exports.exec = exec;
var generateClient = function (model) {
  return {
    aggregate: function (args) {
      return (0, exports.exec)({ func: "aggregate", model: model, args: args });
    },
    count: function (args) {
      return (0, exports.exec)({ func: "count", model: model, args: args });
    },
    create: function (args) {
      return (0, exports.exec)({ func: "create", model: model, args: args });
    },
    delete: function (args) {
      return (0, exports.exec)({ func: "delete", model: model, args: args });
    },
    deleteMany: function (args) {
      return (0, exports.exec)({
        func: "deleteMany",
        model: model,
        args: args,
      });
    },
    findFirst: function (args) {
      return (0, exports.exec)({ func: "findFirst", model: model, args: args });
    },
    findFirstOrThrow: function (args) {
      return (0, exports.exec)({
        func: "findFirstOrThrow",
        model: model,
        args: args,
      });
    },
    findMany: function (args) {
      return (0, exports.exec)({ func: "findMany", model: model, args: args });
    },
    findUnique: function (args) {
      return (0, exports.exec)({
        func: "findUnique",
        model: model,
        args: args,
      });
    },
    findUniqueOrThrow: function (args) {
      return (0, exports.exec)({
        func: "findUniqueOrThrow",
        model: model,
        args: args,
      });
    },
    groupBy: function (args) {
      return (0, exports.exec)({ func: "groupBy", model: model, args: args });
    },
    update: function (args) {
      return (0, exports.exec)({ func: "update", model: model, args: args });
    },
    updateMany: function (args) {
      return (0, exports.exec)({
        func: "updateMany",
        model: model,
        args: args,
      });
    },
    upsert: function (args) {
      return (0, exports.exec)({ func: "upsert", model: model, args: args });
    },
    // pulse-only
    subscribe: function (args) {
      var que = new AsyncBlockingQueue();
      que.stop = (0, exports.exec)(
        { func: "subscribe", model: model, args: args },
        function (event) {
          return que.enqueue(event);
        }
      );
      return que;
    },
  };
};
// Websocket helpers, needed for Pulse enabled projects
var messageCallbacks = {};
var ws;
var getWebsocket = function () {
  return new Promise(function (resolve) {
    if (ws && ws.OPEN) resolve(ws);
    else if (ws && ws.CONNECTING) {
      ws.addEventListener("open", function () {
        return ws && resolve(ws);
      });
    } else {
      ws = new WebSocket(bridg_config_1.default.api);
      ws.addEventListener("message", function (event) {
        var _a;
        var data = JSON.parse(event.data || "{}");
        (_a = messageCallbacks[data.id]) === null || _a === void 0
          ? void 0
          : _a.call(messageCallbacks, data.payload);
      });
      ws.addEventListener("open", function () {
        return ws && resolve(ws);
      });
    }
  });
};
var WsMessage = /** @class */ (function () {
  function WsMessage(payload, type) {
    this.id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    this.payload = payload;
    this.type = type;
  }
  return WsMessage;
})();
var sendWsMsg = function (msg) {
  return getWebsocket().then(function (ws) {
    return ws.send(JSON.stringify(msg));
  });
};
// subscription, with callback
var websocketListener = function (msg, cb) {
  var message = new WsMessage(msg, "subscribe");
  messageCallbacks[message.id] = cb;
  sendWsMsg(message);
  return function () {
    return sendWsMsg({ id: message.id, payload: { func: "unsubscribe" } });
  };
};
// 1 time http-esque request
var websocketPromiseReq = function (msg) {
  return new Promise(function (resolve, reject) {
    var message = new WsMessage(msg);
    messageCallbacks[message.id] = function (_a) {
      var data = _a.data,
        status = _a.status;
      status === 200 ? resolve(data) : reject(data);
      delete messageCallbacks[message.id];
    };
    sendWsMsg(message);
  });
};
// needed for .subscribe AsyncIterable
// https://stackoverflow.com/a/47157577/6791815
var AsyncBlockingQueue = /** @class */ (function () {
  function AsyncBlockingQueue() {
    this.resolvers = [];
    this.promises = [];
  }
  AsyncBlockingQueue.prototype._add = function () {
    var _this = this;
    this.promises.push(
      new Promise(function (resolve) {
        _this.resolvers.push(resolve);
      })
    );
  };
  AsyncBlockingQueue.prototype.stop = function () {};
  AsyncBlockingQueue.prototype.enqueue = function (t) {
    if (!this.resolvers.length) this._add();
    this.resolvers.shift()(t);
  };
  AsyncBlockingQueue.prototype.dequeue = function () {
    if (!this.promises.length) this._add();
    return this.promises.shift();
  };
  AsyncBlockingQueue.prototype.isEmpty = function () {
    return !this.promises.length;
  };
  AsyncBlockingQueue.prototype.isBlocked = function () {
    return !!this.resolvers.length;
  };
  Object.defineProperty(AsyncBlockingQueue.prototype, "length", {
    get: function () {
      return this.promises.length - this.resolvers.length;
    },
    enumerable: false,
    configurable: true,
  });
  AsyncBlockingQueue.prototype[Symbol.asyncIterator] = function () {
    var _a;
    var _this = this;
    return (
      (_a = {
        next: function () {
          return _this.dequeue().then(function (value) {
            return { done: false, value: value };
          });
        },
      }),
      (_a[Symbol.asyncIterator] = function () {
        return this;
      }),
      _a
    );
  };
  return AsyncBlockingQueue;
})();
var userClient = generateClient("user");
var fileClient = generateClient("file");
var hvacObjectClient = generateClient("hvacObject");
var wsTypedObj = bridg_config_1.default.apiIsWebsocket
  ? {
      $sendWebsocketMessage: function (data) {
        return (0, exports.exec)(data);
      },
    }
  : {};
var bridg = __assign(
  { user: userClient, file: fileClient, hvacObject: hvacObjectClient },
  wsTypedObj
);
exports.default = bridg;

export default bridg;
