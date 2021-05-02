const { version } = require('../package.json');
const Peer = require('./Peer');
const WebSocketTransport = require('./transports/WebSocketTransport');
const WebSocketIOTransport = require('./transports/WebSocketIOTransport');

/**
 * Expose mediasoup-client version.
 *
 * @type {String}
 */
exports.version = version;

/**
 * Expose Peer class.
 *
 * @type {Class}
 */
exports.Peer = Peer;

/**
 * Expose WebSocketTransport class.
 *
 * @type {Class}
 */
exports.WebSocketTransport = WebSocketTransport;
exports.WebSocketIOTransport = WebSocketIOTransport;
