const Logger = require("../Logger");
const EnhancedEventEmitter = require("../EnhancedEventEmitter");
const Message = require("../Message");
const io = require("socket.io-client");

const logger = new Logger("WebSocketIOTransport");

class WebSocketIOTransport extends EnhancedEventEmitter {
  /**
   * @param {String} url - WebSocket URL.
   * @param {Object} [options] - Options for WebSocket-Node.W3CWebSocket and retry.
   */
  constructor(url, options) {
    super(logger);
    logger.debug("constructor() [url:%s, options:%o]", url, options);

    // Closed flag.
    // @type {Boolean}
    this._closed = false;

    // WebSocket URL.
    // @type {String}
    this._url = url;

    // Options.
    // @type {Object}
    this._options = options || {};

    // WebSocket instance.
    // @type {WebSocket}
    this._ws = null;

    // Run the WebSocket.
    this._runWebSocket();
  }

  get closed() {
    return this._closed;
  }

  close() {
    if (this._closed) {
			return;
		}

    logger.debug("close()");

    // Don't wait for the WebSocket 'close' event, do it now.
    this._closed = true;
    this.safeEmit("close");

    try {
      this._ws.onopen = null;
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;
      this._ws.close();
    } catch (error) {
      logger.error("close() | error closing the WebSocket: %o", error);
    }
  }

  async send(message) {
    if (this._closed) {
			throw new Error("transport closed");
		}

    try {
      //console.log("SEND :",message);
      this._ws.emit("message",message);
    } catch (error) {
      logger.warn("send() failed:%o", error);
      throw error;
    }
  }

  _runWebSocket() {
    let wasConnected = false;

    if (this._closed) {
      return;
    }

    let ourl = new URL(this._url);
    let query = ourl.search.replace("?", "");
    //console.log(query);
    this._ws = io(ourl.origin, {
      query: query
    });

    // client-side
    this._ws.on("connect", () => {
      if (this._closed)
        return;
      wasConnected = true;
      // Emit 'open' event.
      this.safeEmit("open");
    });

    this._ws.on("disconnect", (event) => {
      if (this._closed) {
        return;
      }
      logger.warn("WebSocket \"close\" event [wasClean:%s, code:%s, reason:\"%s\"]", event);
      this._closed = true;
      // Emit 'close' event.
      this.safeEmit("close");
    });

    this._ws.on("connect_error", (event) => {
      if (this._closed) {
        return;
      }
      logger.error("WebSocket \"error\" event", event);
    });


    this._ws.on("message", (messageRaw) => {
      //console.log("RECV:",messageRaw);
      if (this._closed)
        return;

      const message = Message.parse(messageRaw);
      if (!messageRaw) {
        return;
      }

      if (this.listenerCount("message") === 0) {
        logger.error("no listeners for WebSocket \"message\" event, ignoring received message");
        return;
      }

      // Emit 'message' event.
      this.safeEmit("message", message);
    });
  }
}

module.exports = WebSocketIOTransport;
