const Logger = require("../Logger");
const EnhancedEventEmitter = require("../EnhancedEventEmitter");
const Message = require("../Message");

const logger = new Logger("WebSocketIOTransport");

class WebSocketIOTransport extends EnhancedEventEmitter {
  constructor(io, socket) {
    super(logger);
    logger.debug("constructor()");

    // Closed flag.
    // @type {Boolean}
    this._closed = false;

    this._socket = socket;
    this._io = io;

    // Handle connection.
    this._handleConnection();
  }

  get closed() {
    return this._closed;
  }

  toString() {
    return (
      this._tostring || (this._tostring = "TODO")
    );
  }

  close() {
    if (this._closed)
      return;

    logger.debug("close() [conn:%s]", this);

    // Don't wait for the WebSocket 'close' event, do it now.
    this._closed = true;
    this.safeEmit("close");

    try {
      this._socket.disconnect(true);
    } catch (error) {
      logger.error("close() | error closing the connection: %s", error);
    }
  }

  async send(message) {
    if (this._closed) {
      throw new Error("transport closed");
    }

    try {
      message = JSON.stringify(message);
      //console.log("SEND :",message);
      this._socket.emit("message", message);
    } catch (error) {
      logger.warn("send() failed:%o", error);
      throw error;
    }
  }

  _handleConnection() {
    this._socket.on("disconnect", (code, reason) => {
      if (this._closed) {
        return;
      }
      this._closed = true;
      logger.debug("connection \"close\" event [conn:%s, code:%d, reason:\"%s\"]", this, code, reason);
      // Emit 'close' event.
      this.safeEmit("close");
    });

    this._socket.on("error", (error) => {
      logger.error("connection \"error\" event [conn:%s, error:%s]", this, error);
    });

    this._socket.on("message", (messageRaw) => {
      //console.log("RECV :",messageRaw);
      const message = Message.parse(JSON.stringify(messageRaw));

      if (!message)
        return;

      if (this.listenerCount("message") === 0) {
        logger.error("no listeners for \"message\" event, ignoring received message");
        return;
      }

      // Emit 'message' event.
      this.safeEmit("message", message);
    });
  }
}

module.exports = WebSocketIOTransport;
