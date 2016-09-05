(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\index.js","/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer")
},{"VCmEsw":4,"base64-js":2,"buffer":1,"ieee754":3}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js\\lib\\b64.js","/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\base64-js\\lib")
},{"VCmEsw":4,"buffer":1}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754\\index.js","/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\buffer\\node_modules\\ieee754")
},{"VCmEsw":4,"buffer":1}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\process\\browser.js","/..\\node_modules\\gulp-browserify\\node_modules\\browserify\\node_modules\\process")
},{"VCmEsw":4,"buffer":1}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
﻿"use strict";

var koTools = require('./kotools');

var charting = {};

charting.colors = d3.scale.ordinal().range(["#1f77b4", "#2ca02c", "#d62728", "#393b79", "#ff7f0e", "#8c564b", "#843c39"]);

charting.getElementAndCheckData = function (element, data) {
    var el = d3.select(element);
    if (data === null || data === undefined || data.length === 0) {
        element.innerHTML = "No data available";
        return null;
    }
    element.innerHTML = "";
    return el;
};

charting.legendFont = function(longest){
  if (longest > 20) {
      return 8;
  }
  if(longest > 15) {
    return 10;
  }
  if(longest > 10) {
    return 12;
  }
  return 13;
}

charting.getLegendWidthAndFontSize = function (data) {
    //when there is no legend, just return 0 pixels
    if (!data || data.length === 0) {
        return 0;
    }
    var longest = d3.max(data, function (el) {
        return el.length;
    });
    // we determine the optimal font size and from it calculate the rest (rectangle size and legend width)
    var fontSize = charting.legendFont(longest);
    var rectangleSize = fontSize + 2;
    return {
      fontSize: fontSize + "px",
      width: rectangleSize + (fontSize - 3) * longest,
      rectangle: rectangleSize
    };
};

charting.showStandardLegend = function (parent, data, color, showLegend, height) {
    if (showLegend) {
        var legendDims = charting.getLegendWidthAndFontSize(data);

        var legend = parent
              .append("svg")
              .attr("width", legendDims.width)
              .selectAll("g")
              .data(data)
              .enter().append("g")
              .attr("transform", function (d, i) { return "translate(0," + i * (legendDims.rectangle  + 4) + ")"; });

        legend.append("rect")
              .attr("width", legendDims.rectangle)
              .attr("height", legendDims.rectangle)
              .style("fill", function(i) { return color(i); });


        legend.append("text")
              .attr("x", legendDims.rectangle + 4)
              .attr("y", legendDims.rectangle / 2)
              .attr("font-size", legendDims.fontSize)
              .attr("dy", ".35em")
              .text(function (t) { return t; });
    }
};

charting.headerStyle = function (el) {
    el
         .style("text-align", "left")
         .style("font-size", "12px")
         .style("font-family", "sans-serif")
         .style("margin-bottom", "4px")
         .style("color", "#FFFFFF")
         .style("font-weight", "bold")
         .style("clear", "both")
         .style("float", "left");
};

charting.valueStyle = function (el) {
    el
        .style("text-align", "left")
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        // botom marging is 4 so that the padding of the tooltip on bottom is 6, gives 10 as the padding
        // on top of the tooltip
        .style("margin-bottom", "4px")
        .style("margin-left", "6px")
        .style("color", "#FFFFFF")
        .style("float", "left");
};

charting.showTooltip = function (info) {
    if(d3.select("#toolTipBorder")[0]){
        charting.createTooltip();
    }

    var tooltip = d3.select("#toolTipBorder");
    var tooltipContent = d3.select("#toolTip");
    var key;
    var value;

    tooltipContent.html("");
    for (key in info) {
         if (info.hasOwnProperty(key)) {
            value = info[key];
            charting.headerStyle(tooltipContent.append("div").text(key));

            if (value) {
                if (koTools.isDate(value)) {
                    charting.valueStyle(tooltipContent.append("div").text(value.toFormattedString()));
                } else {
                    charting.valueStyle(tooltipContent.append("div").text(value));
                }
            }
        }
    }

      tooltip.transition()
          .duration(200)
          .style("opacity", ".83");

      tooltip.style("left", (d3.event.pageX + 15) + "px")
          .style("top", (d3.event.pageY - 75) + "px");
};

charting.hideTooltip = function () {
    var toolTip = d3.select("#toolTipBorder");
    toolTip.transition()
        .duration(300)
        .style("opacity", "0");
};

charting.createTooltip = function () {
    var tooltip = d3.select("body")
        .append("div");

    tooltip
        .attr("id", "toolTipBorder")
        .style("position", "absolute")
        .style("opacity", 0)
        .style("background-color", "#111111")
        .style("border-radius", "6px")
        .style("padding", "10px")
        .style("padding-bottom", "6px")
        .append("div")
        .attr("id", "toolTip")
        .style("z-index", 100000);
};

charting.getDimensions = function (options, el) {
    var dims = {};
    dims.margin = { top: options.top || 20, right: options.right || 50, bottom: options.bottom || 30 , left: options.left || 50 };
    dims.width = options.width || 200;
    dims.height = options.height || 100;
    dims.yAxisWidth = 40;
    if(options.yAxisLabel) {
        dims.yAxisWidth = 80;
    }
    if (options.xAxisTextAngle) {
        dims.margin.bottom = options.xAxisTextAngle*50/90 + dims.margin.bottom;
    }

    dims.legendWidth = 0;

    // TODO: would be good to have the real width of the leged here
    if(options.legend){
        dims.legendWidth = 150;
    }

    if(options.xAxisLabel) {
        dims.margin.bottom+= 15;
    }
    dims.containerHeight = dims.height + dims.margin.top + dims.margin.bottom;
    dims.containerWidth = dims.width + dims.yAxisWidth + dims.margin.left + dims.margin.right;

    if (options.fillParentController) {
        dims.containerWidth = koTools.getWidth(el) - dims.legendWidth -  20;
        dims.containerHeight = d3.max([koTools.getHeight(el), options.height]) - 30;

        dims.height = dims.containerHeight - (dims.margin.top + dims.margin.bottom);
        dims.width = dims.containerWidth - (dims.yAxisWidth + dims.margin.left + dims.margin.right);
        dims.fillParentController = true;
    }

    if (options.horizontalSlider) {
        var sliderSpace = 30;
        var afterSlider = 60;

        if (options.xAxisTextAngle) {
            sliderSpace = 60;
            afterSlider = 80;
        }

        dims.sliderHeight = 20;
        dims.containerHeight = dims.height + dims.sliderHeight + sliderSpace + afterSlider;
        dims.sliderOffset = dims.height + sliderSpace;
    }
    return dims;
};

charting.appendContainer = function (el, dims) {
    var svg = el.append("svg")
        .attr("width", dims.containerWidth)
        .attr("height", dims.containerHeight)
        .append("g")
        .attr("transform", "translate(" + dims.margin.left + "," + dims.margin.top + ")");

    return svg;
};

charting.createXAxis = function (svg,options,x,dims) {
  var xAxis = d3.svg.axis()
     .scale(x)
     .orient("bottom");

    if (options.xFormat){
        xAxis.tickFormat(options.xFormat);
    }

    if (options.tickValues){
        xAxis.tickValues(options.tickValues);
    }

    var axis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + dims.height + ")")
        .call(xAxis);

    charting.xAxisStyle(axis);
    charting.rotateAxisText(axis, options);

    if (options.xAxisLabel){
        svg.append("text")
            .style("font-size", "13")
            .style("font-family", "sans-serif")
            .style("font-weight","bold")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", (dims.width / 2) + 35 )
            .attr("y", dims.height + dims.margin.bottom)
            .text(options.xAxisLabel);
    }
    return xAxis;
};

charting.rotateAxisText = function (axis, options) {
    if (options.xAxisTextAngle) {
        axis.selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(" + options.xAxisTextAngle + ")")
            .style("text-anchor", "start");
    }
};

charting.yAxisStyle = function(el)
{
    el.select("path").style("display","none");
    el.selectAll("line").style("shape-rendering","crispEdges").style("stroke","#000");
    el.selectAll("line").style("stroke","#777").style("stroke-dasharray","2.2");
    el.style("font-family", "sans-serif");
    el.style("font-size", "13");
};

charting.xAxisStyle = function(el){
    el.select("path").style("display","none");
    el.select("line").style("shape-rendering","crispEdges").style("stroke","#000");
    el.selectAll("line").style("stroke","#000");
    el.style("font-family", "sans-serif");
    el.style("font-size", "13");
    return el;
};

charting.createYAxis = function (svg, options, yScale, dims) {
    var yAxis = d3.svg.axis().scale(yScale).tickSize(dims.width).orient("right");

    if (options.yFormat){
        yAxis.tickFormat(options.yFormat);
    }

    var axis = svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    charting.yAxisStyle(axis);

    if (options.yAxisLabel) {
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", 0)
            .attr("dy", ".75em")
            .style("font-size", "13")
            .style("font-family", "sans-serif")
            .style("font-weight","bold")
            .text(options.yAxisLabel)
            .attr("transform", "translate(" + (dims.width+dims.yAxisWidth) + "," + (dims.height/2) + ")rotate(-90)");
    }
    return yAxis;
};

charting.determineXScale = function (data, def,options) {
    if (!def) {
        def = {
            allNumbers: true,
            allDates: true,
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE,
            xKeys:[]
        };
    }

    var newKeys = data.map(function (v) {
        if (!koTools.isNumber(v)){
            def.allNumbers = false;
        }
        if (!koTools.isDate(v)){
            def.allDates = false;
        }
        if (v < def.min){
            def.min = v;
        }
        if (v > def.max){
            def.max = v;
        }
        return v;
    });

    if(def.xKeys){
        def.xKeys = def.xKeys.concat(newKeys);
    }else{
        def.xKeys = newKeys;
    }
    def.scaleType = def.allNumbers ? 'linear' : def.allDates ? 'date' : 'ordinal';
    def.xFormat = def.allDates ? koTools.getIdealDateFormat([def.min,def.max]) : null;
    if(!options.xFormat){
        options.xFormat = def.xFormat;
    }

    return def;
};

charting.getXScaleForMultiLines = function (data,options) {
    var def = null;
    data.forEach(function(i) {
        def = charting.determineXScale(i.values.map(function(v) {
            return v.x;
        }), def,options);
    });
    return def;
};

charting.getYScaleDefForMultiline = function (data,options,filteredDomain){
    var def = null;
    data.forEach(function(i) {
        var filteredData = i.values;
        if(filteredDomain){
            filteredData = i.values.filter(function(d){
                return d.x >= filteredDomain[0] && d.x <= filteredDomain[1];
            });
        }
        def = charting.determineYScale(filteredData.map(function(v) {
            return v.y;
        }), def,options);
    });
    return def;
};

charting.determineYScale = function (data, def,options) {
    if (!def) {
        def = {
            min: Number.MAX_VALUE,
            max: Number.MIN_VALUE
        };
    }

    data.forEach(function(v) {
        if (v < def.min){
            def.min = v;
        }
        if (v > def.max){
            def.max = v;
        }
    });

    //setting up margings. how much more on the bottom and on the top of the chart should be shown
    //bellow or above the max and minimum value - carefull to handle negative max values
    if(options.marginCoef){
        var reversedCoef = - options.marginCoef;
        def.max = def.max > 0 ? def.max * options.marginCoef : def.max * reversedCoef;
        def.min = def.min < 0 ? def.min * options.marginCoef : def.min * reversedCoef;
    }

    //the min and max can also be specified in the options directly
    def.min = options.yMin || def.min;
    def.max = options.yMax || def.max;
    return def;
};

//takes the result of determineXScale and creates D3 scale
charting.getXScaleFromConfig = function (def,dims) {
    var x;

    if (def.scaleType === 'linear') {
        x = d3.scale.linear().range([0, dims.width], 0.1);
        x.domain([def.min, def.max]);
    } else if (def.scaleType === 'ordinal') {
        x = d3.scale.ordinal()
            .rangeRoundBands([0, dims.width], 0.1);
        x.domain(def.xKeys);
    } else if (def.scaleType === 'date') {
        x = d3.time.scale().range([0, dims.width], 0.1);
        x.domain([def.min, def.max]);
        x.ticks(10);
    } else {
        throw "invalid scale type";
    }
    return x;
};

charting.xGetter = function (scaleDef, x) {
    return function(d) {
        if (scaleDef.scaleType === 'ordinal'){
            return x(d) + x.rangeBand() / 2;
        }
        if (scaleDef.scaleType === 'date' || scaleDef.scaleType === 'linear'){
            return x(d);
        }
        throw "invalid Scale Type";
    };
};

charting.createVerticalLine = function (svg,x,y){
  return svg.append("line")
      .attr("x1",x)
      .attr("y1", 0)
      .attr("x2", x)
      .attr("y2", y)
      .attr("stroke-width", 2)
      .attr("stroke", "black");
};

charting.mouseCoordinates = function (context,x,y){
  var coordinates = d3.mouse(context);
  return {
      x : coordinates[0],
      y : coordinates[1],
      rY: y.invert(coordinates[1]),
      rX: x.invert(coordinates[0])
  };
};

charting.moveLine = function(line, x){
  var current = line.attr("x1");
  var trans = x - current;
  line.attr("transform", "translate(" + trans + ",0)");
};

charting.createMouseMoveListener = function(svg,dims,callback){
  svg.append("rect")
    .attr("class", "overlay")
    .attr("width", dims.width)
    .attr("height", dims.height)
    .style("fill","none")
    .style("pointer-events","all")
    .on("mousemove", callback);
};

charting.createOrMoveVerticalLine = function(line,svg,dims,x){
  if (!line) {
      return charting.createVerticalLine(svg,x,dims.height);
  }

  charting.moveLine(line,x);
  return line;
};

charting.passOptions = function (func, options){
    return function(d) {
        func(options, d);
    };
};

charting.singlePointOver = function (element, options, d) {
    var info = {};
    var xValue = options.xFormat ? options.xFormat(d.x) : d.x;
    info[xValue] = "";
    var valueName = d.linename || "value";
    info[valueName] = d.y;
    charting.showTooltip(info);
    d3.select(element).style("fill", "black");
};

charting.singlePointOut = function (element) {
    d3.select(element).style("fill", "white");
    charting.hideTooltip();
};


module.exports = charting;

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charting.js","/")
},{"./kotools":14,"VCmEsw":4,"buffer":1}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var koTools = require('./../kotools');
var charting = require('./../charting');

//accepts and array of objects. one property of each object is used as the x-coordinate
//(determined by the xcoord option, which by default is set to 'x')
//the rest of the properties is stacked to the chart
charting.barChart = function (data, element, options, lineData) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el){
        return;
    }

    var defaultOptions = {
        legend: true,
        width: 600,
        height: 200,
        xUnitName: 'x',
        itemName: 'Item',
        xcoord: 'x'
    };

    options = koTools.setDefaultOptions(defaultOptions, options);
    var xcoord = options.xcoord;

    // not all the items do have the same set of properties, therefor scan them all and concatenate the result
    var keys = [];
    data.map(function (i) {
        var itemKeys = d3.keys(i).filter(function (key) { return key !== xcoord && keys.indexOf(key) < 0; });
        keys = keys.concat(itemKeys);
    });

    //we need color for each possible variable
    var color = charting.colors.domain(keys);

    var dims = charting.getDimensions(options, el);

    var xKeys = data.map(function(d){return d[xcoord];});

    // for bar chart the x-scale is always ordinary with range bounds
    // but we run the determining X Scale method anyway
    // because it can help determine the xFormat
    charting.determineXScale(xKeys, null, options);

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, dims.width], 0.3);

    var y = d3.scale.linear()
        .rangeRound([dims.height, 0]);

    //runs overs all the data. copies the result to a new array.
    //for each item we need y0 and y1 - are the y coordinates of the rectangle
    //it is bit tricky to have a something that works for stacked and grouped chart
    var arranged = [];
    var arrangedByX = {};
    data.forEach(function (d) {
        var newD = { x: d[xcoord] };
        var y0Neg = 0;
        var y0Pos = 0;


        var values = [];
        color.domain().forEach(function (m) {
            if (!koTools.isNumber(d[m]) || d[m] === 0 || d[m] === null){
                return;
            }
            var xLabel = newD.x;
            if (options.xFormat){
                xLabel = options.xFormat(newD.x);
            }
            var formattedValue = d[m];
            if (options.yFormat){
                formattedValue = options.yFormat(d[m]);
            }

            var value = {
                name:m,
                val: d[m],
                x: newD.x,
                xLabel: xLabel,
                xUnitName: options.xUnitName,
                formattedValue: formattedValue
            };

            if (d[m] > 0 && options.style === "stack") {
                value.y0 = y0Pos;
                y0Pos += d[m];
                value.y1 = y0Pos;
            } else if (d[m] < 0 && options.style === "stack"){
                var y1 = y0Neg;
                y0Neg += d[m];
                value.y0 = y0Neg;
                value.y1 =  y1;
            } else if (d[m] > 0 && options.style !== "stack"){
                value.y0 = 0;
                value.y1 = d[m];
            } else if(d[m] < 0 && options.style !== "stack"){
                value.y0 = d[m];
                value.y1 = 0;
            }
            values.push(value);
        });

        newD.values = values;
        newD.totalPositive = d3.max(newD.values, function (v) { return v.y1; });
        newD.totalNegative = d3.min(newD.values, function (v) { return v.y0; });
        arranged.push(newD);
        arrangedByX[newD.x] = newD;
    });

    charting.showStandardLegend(el, keys,color, options, dims);

    var svg = charting.appendContainer(el, dims);

    x.domain(xKeys);
    if (options.style === "stack") {
        y.domain([
            d3.min(arranged, function (d) {
              return d.totalNegative;
            }), d3.max(arranged, function (d) {
                if (!d){
                    return 0;
                }
                return d.totalPositive;
            })
        ]);
    } else {
        y.domain(
        [
            d3.min(arranged, function (d) {
                return d3.min(d.values,
                    function (i) {
                        if (i.val < 0){
                            return i.val;
                        }
                        return 0;
                    });
            }),
            d3.max(arranged, function (d) {
                return d3.max(d.values,
                    function (i) { return i.val; });
            })
        ]);
    }

    //for the groupped chart
    var x1 = d3.scale.ordinal();
    x1.domain(keys).rangeRoundBands([0, x.rangeBand()]);

    charting.createXAxis(svg, options, x, dims);
    charting.createYAxis(svg, options, y, dims);


    var onBarOver = function (d) {
        var column = arrangedByX[d.x];
        d3.select(this).style("opacity", 1);
        var info = {};
        info[d.xLabel] = "";
        info[d.name] = d.formattedValue;
        if (column.totalNegative === 0 && options.style === "stack"){
            info[d.name] += " (" + koTools.toPercent(d.val / column.totalPositive) + ")";
        }
        charting.showTooltip(info);
    };

    var onBarOut = function () {
        d3.select(this).style("stroke", 'none');
        d3.select(this).style("opacity", 0.9);
        charting.hideTooltip();
    };

    var group = svg.selectAll(".xVal")
        .data(arranged)
        .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) { return "translate(" + x(d.x) + ",0)"; });

    var rectangles = group.selectAll("rect")
        .data(function (d) { return d.values; })
        .enter().append("rect");

    if (options.style === "stack") {
        rectangles.attr("width", x.rangeBand());
    } else {
        rectangles.attr("width", x1.rangeBand())
          .attr("x", function (d) {
              return x1(d.name);
          });
    }

    rectangles.attr("y", function (d) {
      return y(d.y1);
    })
    .attr("height", function (d) {
      var height = Math.abs(y(d.y0) - y(d.y1));
      return height;
    })
    .on("mouseover", onBarOver)
    .on("mouseout", onBarOut)
    .style("opacity", 0.9)
    .style("cursor", "pointer")
    .style("fill", function (d) {
        return color(d.name);
    });

    //Add the single line for the cashflow like charts
    if (!lineData || lineData.length === 0){
        return;
    }

    var lineY = d3.scale.linear()
        .range([dims.height, 0]);

    var line = d3.svg.line()
        .interpolate("linear")
        .x(function (d) {
            return x(d.x) + x.rangeBand() / 2;
        })
        .y(function (d) {
            return lineY(d.y);
        });

    //in some cases it makes sense to use the same scale for both
    //typically the cash-flow chart
    //for other cases (line  volumne / units correlations a separate scale should be used for each)
    if (!options.sameScaleLinesAndBars) {
        lineY.domain([
            0,
            d3.max(lineData, function (v) { return v.y; })
        ]);
    } else {
        lineY.domain(y.domain());
    }

    var yAxisLeft = d3.svg.axis()
       .scale(lineY)
       .orient("left");

    var leftAxis = svg.append("g")
       .call(yAxisLeft);

    charting.yAxisStyle(leftAxis);

    svg.append("path")
        .attr("d", line(lineData))
        .style("stroke", "blue")
        .style("stroke-width", 2)
        .style("fill", "none");

    var circles = svg.selectAll("circle")
        .data(lineData)
        .enter()
        .append("circle");

    circles.attr("cx", function (d) { return x(d.x) + x.rangeBand() / 2; })
        .attr("cy", function (d) { return lineY(d.y); })
        .attr("r", function () { return 4; })
        .style("fill", "white")
        .attr("r", function () { return 3; })
        .style("fill", "white")
        .style("stroke-width", "1")
        .style("stroke", "black")
        .style("cursor", "pointer")
        .on("mouseover", function(d) { charting.singlePointOver(this, options, d);})
        .on("click", function(d) { charting.singlePointOver(this, options, d);})
        .on("mouseout", function(d) { charting.singlePointOut(this);});
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\barchart.js","/charts")
},{"./../charting":5,"./../kotools":14,"VCmEsw":4,"buffer":1}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";
var koTools = require('./../kotools');
var charting = require('./../charting');

charting.bubbleChart = function (data, element, options) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el) {
        return;
    }

    var defaultOptions = {
        legend: true,
        width: 500,
        height: 200,
        maxBubbleSize: 50,
        bubbleHorizontal: function(d) { return d.x; },
        bubbleVertical: function(d) { return d.y; },
        bubbleSize: function(d) { return d.size; },
        bubbleColor: function(d) { return d.color; },
        horizontalLabel: 'x',
        verticalLabel: 'y',
        sizeLabel: 'size',
        typeLabel: 'type',
        xAxisLabel: false,
        yAxisLabel: false,
        xAxisTextAngle: null
    };

    options = koTools.setDefaultOptions(defaultOptions, options);

    var dims = charting.getDimensions(options, el);
    var horizontalValues = data.map(options.bubbleHorizontal);
    var verticalValues = data.map(options.bubbleVertical);

    var bubbleSizes = data.map(options.bubbleSize);
    bubbleSizes.sort(d3.ascending);

    var maxBubbleSize = d3.max(bubbleSizes);
    var minBubbleSize = d3.min(bubbleSizes);

    var xScaleDef = charting.determineXScale(horizontalValues, null, options);
    var xScale = charting.getXScaleFromConfig(xScaleDef,dims);
    var yScaleDef = charting.determineYScale(verticalValues, null, options);
    var yScale = d3.scale.linear().domain([yScaleDef.min, yScaleDef.max]).range([dims.height, 0]);
    var radiusScale = d3.scale.pow().exponent(0.4).domain([minBubbleSize, maxBubbleSize]).range([1, options.maxBubbleSize]).clamp(true);

    var colors = koTools.distinct(data, options.bubbleColor);
    var colorScale = charting.colors.domain(colors);

    charting.showStandardLegend(el, colors, colorScale, options, dims);
    var svg = charting.appendContainer(el, dims);

    charting.createXAxis(svg, options, xScale, dims);
    charting.createYAxis(svg, options, yScale, dims);

    var bubblenodeMouseout = function () {
        d3.select(this).style("opacity", 0.8);
        charting.hideTooltip();
    };

    var bubblenodeMouseover = function (d) {
        d3.select(this).style("opacity", 1);
        var info = {};
        info[options.typeLabel] = options.bubbleColor(d);
        info[options.sizeLabel] = options.bubbleSize(d);
        info[options.verticalLabel] = options.bubbleVertical(d);
        info[options.horizontalLabel] = options.bubbleHorizontal(d);

        charting.showTooltip(info);
    };

    var xGetter = charting.xGetter(xScaleDef, xScale);

    svg.append("g")
        .attr("class", "dots")
    .selectAll(".dot")
        .data(data)
    .enter().append("circle")
        .attr("class", "dot")
        .style("fill", function (d) { return colorScale(options.bubbleColor(d)); })
        .style("opacity", 0.8)
        .attr("cx", function (d) { return xGetter(options.bubbleHorizontal(d)); })
        .attr("cy", function (d) { return yScale(options.bubbleVertical(d)); })
        .attr("r", function (d) { return radiusScale(options.bubbleSize(d)); })
        .style("cursor", "pointer")
        .on("mouseover", bubblenodeMouseover)
        .on("click", bubblenodeMouseover)
        .on("mouseout", bubblenodeMouseout);
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\bubblechart.js","/charts")
},{"./../charting":5,"./../kotools":14,"VCmEsw":4,"buffer":1}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var koTools = require ('./../kotools');
var charting = require('./../charting');

charting.chordChart = function(data, element, options) {

  var el = charting.getElementAndCheckData(element, data);
  if (!el){
      return;
  }

  var defaultOptions = {
      width: 800,
      height: 800,
      fillParentController:false,
      chordMouseOver: null
  };

  options = koTools.setDefaultOptions(defaultOptions, options);
  var dims = charting.getDimensions(options, el);
  var outerRadius = Math.min(dims.width, dims.height) / 2 - 100;
  var innerRadius = outerRadius - 24;

  //get the name of the item by id
  var descGetter = function (item) {
      if(options.hideNames){
          return item.index + 1;
      }
      return data.names[item.index];
  };

  var color = charting.colors;

  var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

  var layout = d3.layout.chord()
      .padding(0.04);

  var path = d3.svg.chord()
      .radius(innerRadius);

  var svg = el.append("svg")
      .attr("width", dims.width)
      .attr("height", dims.height)
      .append("g")
      .attr("id", "circle")
      .attr("transform", "translate(" + dims.width / 2 + "," + dims.height / 2 + ")");

  var formatValue = function(value){
      if(options.chordFormat){
          value = options.chordFormat(value);
      }
      return value;
  };

  var chordMouseOver = function (g, i) {
      var a1 = data.names[g.source.index];
      var a2 = data.names[g.source.subindex];
      var title = a1 + " - " + a2;
      var info = {};
      var value = formatValue(g.source.value);
      info[title] = value;

      //get all except this chord and put it in background
      svg.selectAll(".chord")
          .filter(function (d, index) {
              return i !== index;
          })
          .transition()
          .style("opacity", 0.1);

      charting.showTooltip(info);
  };

  var chordMouseOut = function (g, i) {
      svg.selectAll(".chord")
          .transition()
          .style("opacity", 1);

      charting.hideTooltip();
  };

  var mouseOverArc = function(opacity) {
      return function (g, i) {
          svg.selectAll(".chord")
              .filter(function (d) {
                  return d.target.index !== i && d.source.index !== i;
              })
              .transition()
              .style("opacity", opacity);

          var info = {};
          var value = formatValue(g.value);
          info[descGetter(g)] = value;
          charting.showTooltip(info);
      };
  };

  layout.matrix(data.matrix);
  var group = svg.selectAll(".group")
      .data(layout.groups)
      .enter().append("g")
      .attr("class", "group");


  group.append("path")
      .attr("id", function(d, i) { return "group" + i; })
      .attr("d", arc)
      .style("fill", function(d, i) { return color(i); })
      .on("mouseover", mouseOverArc(0.1))
      .on("mouseout", mouseOverArc(1));

  group.append("text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", function(d) {
          return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
          "translate(" + (innerRadius + 26) + ")" +
          (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("font-family", "Open Sans, sans-serif")
      .style("font-size", "13px")
      .text(descGetter);

  // Add the chords.
  svg.selectAll(".chord")
      .data(layout.chords)
      .enter().append("path")
      .attr("class", "chord")
      .style("fill", function(d) { return color(d.source.index); })
      .style("cursor","pointer")
      .attr("d", path)
      .on("mouseover", chordMouseOver)
      .on("mouseout", chordMouseOut)
      .on("click", chordMouseOver);
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\chordchart.js","/charts")
},{"./../charting":5,"./../kotools":14,"VCmEsw":4,"buffer":1}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var koTools = require ('./../koTools');
var charting = require('./../charting');

charting.histogram = function(data, element, options) {
    var defaultOptions = {
        bins: 80,
        width: 500,
        fillParentController:false,
        histogramType: 'frequency',
        rangeRounding: 2
    };

    var el = charting.getElementAndCheckData(element,data);
    if (el == null) {
        return;
    }

    options = koTools.setDefaultOptions(defaultOptions, options);
    var dims = charting.getDimensions(options,el);

    var histogramData = d3.layout.histogram()
            .frequency(options.histogramType === 'frequency')
            .bins(options.bins)(data);

    var minX = koTools.isValidNumber(options.min) ? options.min : d3.min(histogramData, function (d) { return d.x; });

    var x = d3.scale.linear()
        .domain([
            minX,
            d3.max(histogramData, function(d) { return d.x; })
        ])
        .range([0, dims.width-10]);
    var columnWidth = x(minX + histogramData[0].dx) - 1;

    var y = d3.scale.linear()
        .domain([0, d3.max(histogramData, function(d) { return d.y; })])
        .range([dims.height, 0]);

    var svg = charting.appendContainer(el, dims);

    var bar = svg.selectAll(".bar")
        .data(histogramData)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")";
        });


    var onBarOver = function (d) {
        d3.select(this).style("opacity", 1);
        var header = options.histogramType == "frequency" ? "count": "probability";
        var info = {};
        info[header] = d.y;
        info["range"] = d.x.toFixed(options.rangeRounding) + " - " + (d.x+d.dx).toFixed(options.rangeRounding);
        charting.showTooltip(info);
    };

    var onBarOut = function () {
        charting.hideTooltip();
        d3.select(this).style("opacity", 0.8);
    };

    bar.append("rect")
        .attr("x", 1)
        .attr("width",columnWidth)
        .attr("height", function(d) {
            return dims.height - y(d.y);
        })
        .attr("fill","#1f77b4")
        .attr("opacity",0.8)
        .style("cursor", "pointer")
        .on("mouseover",onBarOver)
        .on("mouseout",onBarOut);

    charting.createXAxis(svg,options,x,dims);
    charting.createYAxis(svg, options, y, dims);

    var line = d3.svg.line()
        .interpolate("linear")
        .x(function (d) { return x(d.x) + x.rangeBand() / 2; })
        .y(function (d) { return y(d.y); });

    if(options.showProbabilityDistribution){

        var min = koTools.isValidNumber(options.min) ? options.min : d3.min(data);
        var max = koTools.isValidNumber(options.max) ? options.max : d3.max(data);
        var total = d3.sum(data);

        var step = (max - min)/500;
        var expected = total / data.length;
        if(options.expected == 'median'){
            expected = d3.median(data);
        }

        var variance = 0;
        var distances = [];
        data.forEach(function(val){
            var dist = val - expected;
            distances.push(Math.abs(dist));
            variance+= dist*dist;
        });


        if(options.useMAD){
            variance = d3.median(distances);
        }else{
            variance= variance / data.length-1;
        }

        var i = 0;
        var probData = [];
        for (i = min;i<max;i+=step) {
            var powE = -(i-expected)*(i-expected)/(2*variance);
            var prob = (1 / Math.sqrt(2*Math.PI*variance)) * Math.pow(Math.E,powE);
            probData.push({x:i, y:prob});
        }

        var y = d3.scale.linear()
          .range([dims.height, 0]);

        y.domain([
            d3.min(probData,function(d){return d.y;}),
            d3.max(probData, function(d) { return d.y; })
        ]);

        var minX =d3.min(probData,function(i){return i.x;});
        var maxX =d3.max(probData, function(i) { return i.x; });

        x.domain([
            minX,
            maxX
        ]);

        var lineFunction = d3.svg.line()
          .interpolate("linear")
          .x(function(d) {
              return x(d.x);
          })
          .y(function(d) {
              return y(d.y);
          });

        svg.append("path")
          .attr("class", "line")
          .attr("d", lineFunction(probData))
          .style("stroke-width", 2)
          .style("stroke", "red")
          .style("fill", "none");

        if(options.showOutliers){
            data.forEach(function(el){
                var elDist = Math.abs(el - expected);

                if (elDist > variance * options.tolerance) {
                    svg.append("circle")
                        .attr("cx", x(el) + 2)
                        .attr("cy", dims.height)
                        .attr("r", 4)
                        .attr("fill", "green")
                        .attr("opacity", 0.8);
                }
            });
        }
    }
}

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\histogramchart.js","/charts")
},{"./../charting":5,"./../koTools":13,"VCmEsw":4,"buffer":1}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var koTools = require ('./../koTools');
var charting = require('./../charting');

//Takes as input collection of items [data]. Each item has two values [x] and [y].
//[{x:1, receivedEtf:123, tradedEtf:100},{x:2, receivedEtf:200, tradedEtf:100}]
//[{linename:receivedEtf, values:[x:q1, y:200]}]
charting.lineChart = function (data, element, options) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el) {
        return;
    }

    var defaultOptions = {
        legend: true,
        width: 200,
        height: 200,
        horizontalLabel: 'x',
        verticalLabel: 'y',
        showDataPoints: true,
        verticalCursorLine: false,
        xAxisLabel: false,
        yAxisLabel: false,
        xAxisTextAngle: null
    };

    options = koTools.setDefaultOptions(defaultOptions, options);

    data.forEach(function (singleLine) {
        if (!singleLine.values) {
            throw "Each line needs to have values property containing tuples of x and y values";
        }

        //sort each line using the x coordinate
        singleLine.values.sort(function (a, b) {
            return d3.ascending(a.x, b.x);
        });

        singleLine.values.forEach(function (d) {
            d.linename = singleLine.linename;
        });
    });

    // define all the linenames to compute thed legen width approximation
    var linenames = data.map(function (item) { return item.linename; });

    // points collection will be initilized only if the users wants to see the line points
    var points = null;

    //we need also one color per linename
    var color = d3.scale.category20();
    color.domain(linenames);

    //and helper function to get the color
    var getColor = function (l) {
        return l.color || color(l.linename);
    };

    var dims = charting.getDimensions(options, el, linenames);

    var y = d3.scale.linear()
        .range([dims.height, 0]);

    var scaleDef = charting.getXScaleForMultiLines(data, options);
    var x = charting.getXScaleFromConfig(scaleDef, dims);
    var getX = function (d) {
        return charting.xGetter(scaleDef, x)(d.x);
    };

    var yScaleDef = charting.getYScaleDefForMultiline(data, options);

    y.domain([yScaleDef.min, yScaleDef.max]);

    var line = d3.svg.line()
        .interpolate("linear")
        .x(getX)
        .y(function (d) { return y(d.y); });

    var svg = charting.appendContainer(el, dims);

    charting.showStandardLegend(el, linenames, color, options, dims);

    if (options.xTick) {
        var xValues = scaleDef.xKeys.filter(function (k) {
            return k % options.xTick === 0;
        });
        options.tickValues = xValues;
    }
    var xAxis = charting.createXAxis(svg, options, x, dims);
    var yAxis = charting.createYAxis(svg, options, y, dims);

    //howering over a line will just show a tooltip with line name
    var lineMouseOver = function (d) {
        var info = {};
        // TODO: would be good to have the y value here
        info[d.linename] = "";
        charting.showTooltip(info);
    };

    var lines = svg.selectAll(".lines")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("d", function (d) {
            return line(d.values);
        })
        .style("stroke-width", function (d) {
            return d.width || 2;
        })
        .style("stroke", function (d) {
            return getColor(d);
        })
        .style("fill", "none")
        .on("mouseover", lineMouseOver)
        .on("mouseout", charting.hideTooltip)
        .attr("clip-path", "url(#clip)");

    if (options.showDataPoints) {

        var allPoints = data.length === 1 ? data[0].values : data.reduce(function(a, b) {
            if (a.values) {
                return a.values.concat(b.values);
            }
            return a.concat(b.values);
        });

        points = svg.selectAll(".point")
            .data(allPoints)
            .enter()
            .append("circle")
            .attr("cx", getX)
            .attr("cy", function (d) { return y(d.y); })
            .attr("r", function () { return 3; })
            .style("fill", "white")
            .style("stroke-width", "1")
            .style("stroke", "black")
            .style("cursor", "pointer")
            .on("mouseover", function(d) { charting.singlePointOver(this, options, d);})
            .on("click", function(d) { charting.singlePointOver(this, options, d);})
            .on("mouseout", function() { charting.singlePointOut(this);})
            .attr("clip-path", "url(#clip)");
    }

    if (options.horizontalSlider) {
        var context = svg.append("g")
            .attr("transform", "translate(" + "0" + "," + dims.sliderOffset + ")")
            .attr("class", "context");

        var slidderScale = charting.getXScaleFromConfig(scaleDef, dims);

        var allTicks = x.ticks();
        var startMin = allTicks[2];
        var startMax = allTicks[7];

        var brush = d3.svg.brush()
            .x(slidderScale)
            .extent([startMin, startMax]);

        var brushed = function () {
            var filteredDomain = brush.empty() ? slidderScale.domain() : brush.extent();
            x.domain(filteredDomain);

            var axis = svg.select(".x.axis");
            axis.transition().call(xAxis);
            charting.rotateAxisText(axis, options);
            charting.xAxisStyle(axis);

            yScaleDef = charting.getYScaleDefForMultiline(data, options, filteredDomain);
            y.domain([yScaleDef.min, yScaleDef.max]);

            axis = svg.select(".y.axis");
            axis.transition().call(yAxis);
            charting.yAxisStyle(axis);

            lines.transition()
                .attr("d", function (d) {
                    return line(d.values);
                });

            if (points) {
                points.transition()
                    .attr("cx", getX)
                    .attr("cy", function (d) { return y(d.y); });
            }
        };

        brush.on("brush", brushed);

        var sliderAxis = d3.svg.axis()
            .scale(slidderScale)
            .tickFormat(options.xFormat)
            .orient("bottom");

        var sliderAxisElement = context.append("g")
            .attr("class", "x sliderAxis")
            .attr("transform", "translate(0," + dims.sliderHeight + ")")
            .call(sliderAxis);
        charting.xAxisStyle(sliderAxisElement);
        charting.rotateAxisText(sliderAxisElement, options);

        svg.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", dims.width)
            .attr("height", dims.height);

        var contextArea = d3.svg.area()
            .interpolate("monotone")
            .x(function (d) { return slidderScale(d.x); })
            .y0(dims.sliderHeight)
            .y1(0);

        context.append("path")
            .attr("class", "area")
            .attr("d", contextArea(data[0].values))
            .attr("fill", "#F1F1F2");

        context.append("g")
            .attr("class", "x brush")
            .call(brush)
            .selectAll("rect")
            .attr("height", dims.sliderHeight)
            .attr("fill", "#1f77b4")
            .attr("rx", "5");
    }
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\linechart.js","/charts")
},{"./../charting":5,"./../koTools":13,"VCmEsw":4,"buffer":1}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var koTools = require ('./../koTools');
var charting = require('./../charting');

charting.pieChart = function(data, element,options) {
    var el = charting.getElementAndCheckData(element, data);
    if (!el) {
        return;
    }

    var defaultOptions = {
        legend: true,
        width: 200,
        height: 150,
        left: 3,
        right:3
    };

    options = koTools.setDefaultOptions(defaultOptions, options);

    //for a piechart only positive values make sense
    data = data.filter(function (i) {
        return i.y > 0;
    });

    if (data.length === 0){
        return;
    }

    var color = options.colors || charting.colors;
    var xKeys = data.map(function (i) { return i.x; });

    //the color scale can be passed from outside...
    if(!options.colors){
        color.domain(xKeys);
    }
    var dims = charting.getDimensions(options, el);

    var outerRadius = Math.min(dims.width, dims.height) / 2 - 3;
    var donut = d3.layout.pie();
    var arc = d3.svg.arc().outerRadius(outerRadius);
    var labelRadius = outerRadius-30;
    var labelArc = d3.svg.arc().outerRadius(labelRadius).innerRadius(labelRadius);

    donut.value(function (d) { return d.y; });
    var sum = d3.sum(data, function (item) { return item.y; });

    //piechart shows the values in the legend as well
    //that's why it passes the whole data collection and both, description and value function provider
    charting.showStandardLegend(el, xKeys, color, options, dims);
    var svg = charting.appendContainer(el, dims);
    svg.data([data]);

    var arcs = svg.selectAll("g.arc")
        .data(donut)
      .enter().append("g")
        .attr("class", "arc")
        .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

    var arcMouseOver = function(d) {
        d3.select(this).style("stroke", 'white');
        d3.select(this).style("opacity", 1);
        var info = {};
        var value = d.formatted + " (" + koTools.toPercent(d.percentage) + ")";
        info[d.data.x] = value;
        charting.showTooltip(info);
    };

    var arcMouseOut = function() {
        d3.select(this).style("opacity", 0.9);
        charting.hideTooltip();
    };

    arcs.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.data.x); })
        .style("stroke-width", 2)
        .style("stroke", "white")
        .on("mouseover", arcMouseOver)
        .on("mouseout", arcMouseOut)
        .style("cursor", "pointer")
        .style("opacity",0.9)
        .each(function(d) {
            d.percentage = d.data.y / sum;
            d.formatted = options.yFormat ? options.yFormat(d.data.y) : d.data.y;
        });

    arcs.append("text")
        .attr("transform", function(d) {
            return "translate(" + labelArc.centroid(d) + ")";
        })
        .style("font-family", "sans-serif")
        .style("font-size", 12)
        .style("fill", "#FFFFFF")
        .style("font-weight", "bold")
        .style("text-anchor", "middle")
        //.attr("dy", ".35em")
        .text(function(d) {
            return (d.percentage*100).toCurrencyString("%",1);
        });
};

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/charts\\piechart.js","/charts")
},{"./../charting":5,"./../koTools":13,"VCmEsw":4,"buffer":1}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
"use strict";

var kotools = require ('./kotools');
var charting = require('./charting');
require('./charts/piechart');
require('./charts/barchart');
require('./charts/linechart');
require('./charts/chordchart');
require('./charts/bubblechart');
require('./charts/histogramchart');

function koextensions() {
  var self = this;

  //let tools and charting be accesible globaly
  self.tools = kotools;
  self.charting = charting;

  self.registerExtensions = function () {
      if (typeof(ko) === 'undefined') {
          console.log("Knockout was not found, using standalon KoExtensions for charting");
          return;
      }

      ko.bindingHandlers.datepicker = {
          init: function(element, valueAccessor, allBindingsAccessor) {
              //initialize datepicker with some optional options
              var options = allBindingsAccessor().datepickerOptions || {};
              $(element).datepicker(options);

              //when a user changes the date, update the view model
              ko.utils.registerEventHandler(element, "changeDate", function(event) {
                  var value = valueAccessor();
                  if (ko.isObservable(value)) {
                      value(event.date);
                  }
              });
          },
          update: function(element, valueAccessor) {
              var widget = $(element).data("datepicker");

              if (widget != null) {
                  var vmValue = ko.utils.unwrapObservable(valueAccessor());

                  //if we have a string value - convert it first
                  if (kotools.isString(vmValue)) {
                      vmValue = new Date(vmValue);
                  }

                  //if the date is not valid - don't visualize it, or we would have a "NaN/NaN/NaN"
                  if (!kotools.isValidDate(vmValue)) {
                      return;
                  }

                  widget.setDates(vmValue);
              }
          }
      };

      ko.bindingHandlers.linechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var options = allBindingsAccessor().chartOptions;
              var data = allBindingsAccessor().linechart();
              charting.lineChart(data, element, options);
          }
      };

      ko.bindingHandlers.piechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = allBindingsAccessor().piechart();
              var options = allBindingsAccessor().chartOptions;
              charting.pieChart(data, element, options);
          }
      };

      ko.bindingHandlers.barchart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              var line = ko.unwrap(allBindingsAccessor().line);
              charting.barChart(data, element, options, line);
          }
      };

      ko.bindingHandlers.chordChart = {
          update: function (element, valueAccessor, allBindingsAccessor) {
              var data = allBindingsAccessor().chordChart();
              var options = allBindingsAccessor().chartOptions;
              charting.chordChart(data, element, options);
          }
      };

      ko.bindingHandlers.histogram = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.histogram(data, element, options);
          }
      };

      ko.bindingHandlers.scatterplot = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.scatterPlot(data, element, options);
          }
      };

      ko.bindingHandlers.bubblechart = {
          update: function(element, valueAccessor, allBindingsAccessor) {
              var data = ko.unwrap(valueAccessor());
              var options = ko.unwrap(allBindingsAccessor().chartOptions);
              charting.bubbleChart(data, element, options);
          }
      };

      ko.bindingHandlers.formattedValue = {
          update: function (element, valueAccessor, allBindingsAccessor) {
              var fValue = getFormattedValueFromAccessor(allBindingsAccessor());
              applyFormattedValue(fValue, element);
          }
      }

      ko.bindingHandlers.progress = {
          init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
              var value = valueAccessor()();
              if (value == null)
                  value = 0;
              element.style.width = value + "%";
              element.style.display = 'none';
              element.style.display = 'block';
          },
          update: function (element, valueAccessor, allBindingsAccessor) {
              var value = valueAccessor()();
              if (value == null)
                  value = 0;
              element.style.width = value + "%";
          }
      };
  };

  function applyFormattedValue(fValue, element) {
      //TODO: test if val is function  => observable then evaluate, test if it is a number before calling toCurrencyString
      if (fValue.val != null) {
          if (fValue.transf != null)
              fValue.val = fValue.transf(fValue.val);
          if (kotools.isNumber(fValue.val)) {
              element.innerHTML = fValue.val.toCurrencyString(fValue.currency, fValue.rounding);
          } else if (kotools.isDate(fValue.val)) {
              element.innerHTML = fValue.val.toFormattedString();
          } else {
              element.innerHTML = fValue.val;
          }
      }
  };

  function getFormattedValueFromAccessor(accessor) {
      var fValue = {
          currency: getValue(accessor.currency),
          val: getValue(accessor.formattedValue),
          transf: accessor.transformation,
          rounding: getValue(accessor.rounding)
      };
      return fValue;
  }



  function getValue(val) {
      if (val != null && typeof (val) == 'function')
          val = val();
      return val;
  };
};

var koext = new koextensions();
koext.registerExtensions();

module.exports = koext;

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_59d615d0.js","/")
},{"./charting":5,"./charts/barchart":6,"./charts/bubblechart":7,"./charts/chordchart":8,"./charts/histogramchart":9,"./charts/linechart":10,"./charts/piechart":11,"./kotools":14,"VCmEsw":4,"buffer":1}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
﻿"use strict";

function kotools() {

    var self = this;
    var today = new Date();

    self.currentYear = today.getFullYear();
    self.currentMonth = today.getMonth();
    self.isEmpty = function (str) {
        return (!str || 0 === str.length);
    };

    Date.prototype.toFormattedString = function () {
        var cDate = this.getDate();
        var cMonth = this.getMonth() + 1; //Months are zero based
        var cYear = this.getFullYear();
        return cDate + "/" + cMonth + "/" + cYear;
    };

    Array.prototype.setOrAdd = function (x, y, value) {
        if (this[x] === null || this[x] === undefined) {
            this[x] = [];
        }
        if (this[x][y] === null || isNaN(this[x][y])){
            this[x][y] = value;
        }
        else{
            this[x][y] += value;
        }
    };

    Array.prototype.set = function (x, y, value) {
        if (!this[x]){
            this[x] = [];
        }
        this[x][y] = value;
    };

    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    self.getQuarter = function(item) {
        if (item.Year !== null && item.Quarter !== null) {
            return "Q" + item.Quarter + item.Year;
        }
        return null;
    };

    self.paddy = function (n, p, c) {
        var pad_char = c !== 'undefined' ? c : '0';
        var pad = [1 + p].join(pad_char);
        return (pad + n).slice(-pad.length);
    };

    self.getMonth = function(item) {
        if (item.Year !== null && item.Month !== null) {
            return String(item.Year) + self.paddy(item.Month, 2).toString();
        }
        return null;
    };

    self.monthsComparer = function(item1, item2) {
        if (self.isString(item1)) {
            var year1 = parseInt(item1.substring(0, 4), 10);
            var month1 = parseInt(item1.substring(4, item1.length), 10);

            var year2 = parseInt(item2.substring(0, 4), 10);
            var month2 = parseInt(item2.substring(4, item2.length), 10);

            if (year1 === year2) {
                return d3.ascending(month1, month2);
            }

            return d3.ascending(year1, year2);
        }
        return d3.ascending(item1, item2);
    };

    self.monthsIncrementer = function(item) {
        var year = parseInt(item.substring(0, 4), 10);
        var month = parseInt(item.substring(4, item.length), 10);

        if (month === 12) {
            month = 1;
            year++;
        } else {
            month++;
        }
        var yyyy = year.toString();
        var mm = month.toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.quartersComparer = function(item1, item2) {
        var q1 = item1.substring(1, 2);
        var year1 = item1.substring(2, 6);

        var q2 = item2.substring(1, 2);
        var year2 = item2.substring(2, 6);

        if (year1 === year2) {
            return d3.ascending(q1, q2);
        }

        return d3.ascending(year1, year2);
    };

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    self.getYearAndMonthLabel = function(i) {
        if (!self.isString(i)) {
            return "";
        }
        var month = monthNames[parseInt(i.substring(4, i.length), 10) - 1];
        return month;
    };

    self.getProperty = function(key, d) {
        if (typeof key === "function") {
            return key(d);
        }
        return d[key];
    };

    self.getWidth = function(el)
    {
        if (el.clientWidth){
            return el.clientWidth;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getWidth(el[0]);
        }
        return null;
    };


    self.getHeight = function(el)
    {
        if (el.clientHeight && el.clientHeight !== 0){
            return el.clientHeight;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getHeight(el[0]);
        }

        if (el.parentElement !== null) {
            return self.getHeight(el.parentElement);
        }

        return null;
    };

    self.find = function(data, predicate) {
        var i = 0;
        for (i = 0; i < data.length; i++) {
            if (predicate(data[i])) {
                return data[i];
            }
        }
        return null;
    };

    self.isString = function(x) {
        return typeof x === 'string';
    };

    self.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    self.isValidNumber = function(n) {
        return n !== null && !isNaN(n);
    };

    self.isDate = function(d) {
        return Object.prototype.toString.call(d) === "[object Date]";

    };

    Number.prototype.formatMoney = function(c, d, t) {
        var n = this;
        c = isNaN(c = Math.abs(c)) ? 2 : c;
        d = d === undefined ? "." : d;
        t = t === undefined ? "," : t;
        var s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    self.parseDate = function(input) {
        if (input instanceof Date) {
            return input;
        }

        //first get rid of the hour & etc...
        var firstSpace = input.indexOf(" ");

        if (firstSpace !== -1) {
            input = input.substring(0, firstSpace);
            var separator = "/";
            var parts = [];
            if (input.indexOf("-") !== -1) {
                separator = "-";
                parts = input.split(separator);
                if (parts.length === 3) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else if (input.indexOf("/") !== -1) {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        }
        return new Date(Date.parse(input));
    };

    //verify that the date is valid => object is date-time and there is a meaningful value
    self.isValidDate = function(d) {
        if (!self.isDate(d)) {
            return false;
        }
        return !isNaN(d.getTime());
    };

    self.compare = function(x, y) {
        for (var propertyName in x) {
            if (x[propertyName] !== y[propertyName]) {
                return false;
            }
        }
        return true;
    };

    self.toLength = function(val, length) {
        if (val.length >= length) {
            return val.substring(0, length);
        }

        var returnVal = "";
        for (var i = 0; i < length; i++) {
            returnVal += val[i % val.length];
        }
        return returnVal;
    };

    Number.prototype.toCurrencyString = function(cur, decSpaces) {
        var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
        if (cur != null)
            formatted += ' ' + cur;
        return formatted;
    };

    self.toPercent = function(val) {
        if (val === null)
            return 0;
        return (val * 100).toFixed(1) + " %";
    };

    //Size of the object - equivalent of array length
    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };


    var objToString = Object.prototype.toString;

    function isString(obj) {
        return objToString.call(obj) == '[object String]';
    }

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };

    //difference in 2 arrays
    self.diff = function(a1, a2) {
        return a1.filter(function(i) { return a2.indexOf(i) < 0; });
    };

    self.tryConvertToNumber = function(orgValue) {
        var intValue = parseInt(orgValue);
        var decimalValue = parseFloat(orgValue);
        var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
        return value;
    };

    self.toBoolean = function(string) {
        if (string == null)
            return false;
        switch (string.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
        case null:
            return false;
        default:
            return Boolean(string);
        }
    };

    self.dateToFrenchString = function(date) {
        var month = date.getMonth() + 1;
        return date.getDate() + "/" + month + "/" + date.getFullYear();
    };

    self.dateToUSString = function(date) {
        var month = date.getMonth() + 1;
        return month + "/" + date.getDate() + "/" + date.getFullYear();
    };

    self.getYearAndMonth = function(date) {
        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth() + 1).toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.splitMonthAndYear = function(monthAndYear) {
        return {
            year: self.tryConvertToNumber(monthAndYear.substring(0, 4)),
            month: self.tryConvertToNumber(monthAndYear.substring(4, 6))
        };
    };

    self.distinct = function(data, mapper) {
        var mapped = data.map(mapper);
        return mapped.filter(function(v, i) { return mapped.indexOf(v) == i; });
    };

    self.convertSeriesToXYPairs = function(data) {
        var converted = [];
        for (var i = 0; i < data.length; i++) {
            converted.push({ x: i, y: data[i] });
        }
        return converted;
    };

    self.convertAllSeriesToXYPairs = function (data) {
        if (data == null) {
            return null;
        }
        for (var i = 0; i < data.length; i++) {
            if (data[i] != null && data[i].values != null) {
                if (self.isNumber(data[i].values[0])) {
                    data[i].values = self.convertSeriesToXYPairs(data[i].values);
                }
            }
        }
        return data;
    };

    self.setDefaultOptions = function (defaultConfig, config) {
        config = config || {};
        for (var key in defaultConfig) {
            config[key] = config[key] != null ? config[key] : defaultConfig[key];
        }
        return config;
    };

    self.getIdealDateFormat = function(range) {
        var min = range[0];
        var max = range[1];
        var oneDay = 24*60*60*1000;
        var diffDays = Math.round(Math.abs((max.getTime() - min.getTime())/(oneDay)));

        if(diffDays > 5){
            return function(d){
                var val = d.toFormattedString();
                return val;
            };
        }else {
            var diffHours = Math.abs(max - min) / 36e5;
            if(diffHours > 2){
                return function(d){
                    return d.getHours() + ":" + d.getMinutes();
                };
            }else{
                return function(d) { return d.getMinutes() + ":" + d.getSeconds();};
            }
        }
    }
  }

  module.exports = new kotools();

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/koTools.js","/")
},{"VCmEsw":4,"buffer":1}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
﻿"use strict";

function kotools() {

    var self = this;
    var today = new Date();

    self.currentYear = today.getFullYear();
    self.currentMonth = today.getMonth();
    self.isEmpty = function (str) {
        return (!str || 0 === str.length);
    };

    Date.prototype.toFormattedString = function () {
        var cDate = this.getDate();
        var cMonth = this.getMonth() + 1; //Months are zero based
        var cYear = this.getFullYear();
        return cDate + "/" + cMonth + "/" + cYear;
    };

    Array.prototype.setOrAdd = function (x, y, value) {
        if (this[x] === null || this[x] === undefined) {
            this[x] = [];
        }
        if (this[x][y] === null || isNaN(this[x][y])){
            this[x][y] = value;
        }
        else{
            this[x][y] += value;
        }
    };

    Array.prototype.set = function (x, y, value) {
        if (!this[x]){
            this[x] = [];
        }
        this[x][y] = value;
    };

    Date.prototype.addDays = function (days) {
        var dat = new Date(this.valueOf());
        dat.setDate(dat.getDate() + days);
        return dat;
    };

    self.getQuarter = function(item) {
        if (item.Year !== null && item.Quarter !== null) {
            return "Q" + item.Quarter + item.Year;
        }
        return null;
    };

    self.paddy = function (n, p, c) {
        var pad_char = c !== 'undefined' ? c : '0';
        var pad = [1 + p].join(pad_char);
        return (pad + n).slice(-pad.length);
    };

    self.getMonth = function(item) {
        if (item.Year !== null && item.Month !== null) {
            return String(item.Year) + self.paddy(item.Month, 2).toString();
        }
        return null;
    };

    self.monthsComparer = function(item1, item2) {
        if (self.isString(item1)) {
            var year1 = parseInt(item1.substring(0, 4), 10);
            var month1 = parseInt(item1.substring(4, item1.length), 10);

            var year2 = parseInt(item2.substring(0, 4), 10);
            var month2 = parseInt(item2.substring(4, item2.length), 10);

            if (year1 === year2) {
                return d3.ascending(month1, month2);
            }

            return d3.ascending(year1, year2);
        }
        return d3.ascending(item1, item2);
    };

    self.monthsIncrementer = function(item) {
        var year = parseInt(item.substring(0, 4), 10);
        var month = parseInt(item.substring(4, item.length), 10);

        if (month === 12) {
            month = 1;
            year++;
        } else {
            month++;
        }
        var yyyy = year.toString();
        var mm = month.toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.quartersComparer = function(item1, item2) {
        var q1 = item1.substring(1, 2);
        var year1 = item1.substring(2, 6);

        var q2 = item2.substring(1, 2);
        var year2 = item2.substring(2, 6);

        if (year1 === year2) {
            return d3.ascending(q1, q2);
        }

        return d3.ascending(year1, year2);
    };

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    self.getYearAndMonthLabel = function(i) {
        if (!self.isString(i)) {
            return "";
        }
        var month = monthNames[parseInt(i.substring(4, i.length), 10) - 1];
        return month;
    };

    self.getProperty = function(key, d) {
        if (typeof key === "function") {
            return key(d);
        }
        return d[key];
    };

    self.getWidth = function(el)
    {
        if (el.clientWidth){
            return el.clientWidth;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getWidth(el[0]);
        }
        return null;
    };


    self.getHeight = function(el)
    {
        if (el.clientHeight && el.clientHeight !== 0){
            return el.clientHeight;
        }

        if (Array.isArray(el) && el.length > 0) {
            return self.getHeight(el[0]);
        }

        if (el.parentElement !== null) {
            return self.getHeight(el.parentElement);
        }

        return null;
    };

    self.find = function(data, predicate) {
        var i = 0;
        for (i = 0; i < data.length; i++) {
            if (predicate(data[i])) {
                return data[i];
            }
        }
        return null;
    };

    self.isString = function(x) {
        return typeof x === 'string';
    };

    self.isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    self.isValidNumber = function(n) {
        return n !== null && !isNaN(n);
    };

    self.isDate = function(d) {
        return Object.prototype.toString.call(d) === "[object Date]";

    };

    Number.prototype.formatMoney = function(c, d, t) {
        var n = this;
        c = isNaN(c = Math.abs(c)) ? 2 : c;
        d = d === undefined ? "." : d;
        t = t === undefined ? "," : t;
        var s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    self.parseDate = function(input) {
        if (input instanceof Date) {
            return input;
        }

        //first get rid of the hour & etc...
        var firstSpace = input.indexOf(" ");

        if (firstSpace !== -1) {
            input = input.substring(0, firstSpace);
            var separator = "/";
            var parts = [];
            if (input.indexOf("-") !== -1) {
                separator = "-";
                parts = input.split(separator);
                if (parts.length === 3) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else if (input.indexOf("/") !== -1) {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        }
        return new Date(Date.parse(input));
    };

    //verify that the date is valid => object is date-time and there is a meaningful value
    self.isValidDate = function(d) {
        if (!self.isDate(d)) {
            return false;
        }
        return !isNaN(d.getTime());
    };

    self.compare = function(x, y) {
        for (var propertyName in x) {
            if (x[propertyName] !== y[propertyName]) {
                return false;
            }
        }
        return true;
    };

    self.toLength = function(val, length) {
        if (val.length >= length) {
            return val.substring(0, length);
        }

        var returnVal = "";
        for (var i = 0; i < length; i++) {
            returnVal += val[i % val.length];
        }
        return returnVal;
    };

    Number.prototype.toCurrencyString = function(cur, decSpaces) {
        var formatted = this.toFixed(decSpaces).replace(/(\d)(?=(\d{3})+\b)/g, '$1 ');
        if (cur != null)
            formatted += ' ' + cur;
        return formatted;
    };

    self.toPercent = function(val) {
        if (val === null)
            return 0;
        return (val * 100).toFixed(1) + " %";
    };

    //Size of the object - equivalent of array length
    Object.size = function(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };


    var objToString = Object.prototype.toString;

    function isString(obj) {
        return objToString.call(obj) == '[object String]';
    }

    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };

    //difference in 2 arrays
    self.diff = function(a1, a2) {
        return a1.filter(function(i) { return a2.indexOf(i) < 0; });
    };

    self.tryConvertToNumber = function(orgValue) {
        var intValue = parseInt(orgValue);
        var decimalValue = parseFloat(orgValue);
        var value = intValue != null ? intValue : (decimalValue != null ? decimalValue : orgValue);
        return value;
    };

    self.toBoolean = function(string) {
        if (string == null)
            return false;
        switch (string.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
        case null:
            return false;
        default:
            return Boolean(string);
        }
    };

    self.dateToFrenchString = function(date) {
        var month = date.getMonth() + 1;
        return date.getDate() + "/" + month + "/" + date.getFullYear();
    };

    self.dateToUSString = function(date) {
        var month = date.getMonth() + 1;
        return month + "/" + date.getDate() + "/" + date.getFullYear();
    };

    self.getYearAndMonth = function(date) {
        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth() + 1).toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]);
    };

    self.splitMonthAndYear = function(monthAndYear) {
        return {
            year: self.tryConvertToNumber(monthAndYear.substring(0, 4)),
            month: self.tryConvertToNumber(monthAndYear.substring(4, 6))
        };
    };

    self.distinct = function(data, mapper) {
        var mapped = data.map(mapper);
        return mapped.filter(function(v, i) { return mapped.indexOf(v) == i; });
    };

    self.convertSeriesToXYPairs = function(data) {
        var converted = [];
        for (var i = 0; i < data.length; i++) {
            converted.push({ x: i, y: data[i] });
        }
        return converted;
    };

    self.convertAllSeriesToXYPairs = function (data) {
        if (data == null) {
            return null;
        }
        for (var i = 0; i < data.length; i++) {
            if (data[i] != null && data[i].values != null) {
                if (self.isNumber(data[i].values[0])) {
                    data[i].values = self.convertSeriesToXYPairs(data[i].values);
                }
            }
        }
        return data;
    };

    self.setDefaultOptions = function (defaultConfig, config) {
        config = config || {};
        for (var key in defaultConfig) {
            config[key] = config[key] != null ? config[key] : defaultConfig[key];
        }
        return config;
    };

    self.getIdealDateFormat = function(range) {
        var min = range[0];
        var max = range[1];
        var oneDay = 24*60*60*1000;
        var diffDays = Math.round(Math.abs((max.getTime() - min.getTime())/(oneDay)));

        if(diffDays > 5){
            return function(d){
                var val = d.toFormattedString();
                return val;
            };
        }else {
            var diffHours = Math.abs(max - min) / 36e5;
            if(diffHours > 2){
                return function(d){
                    return d.getHours() + ":" + d.getMinutes();
                };
            }else{
                return function(d) { return d.getMinutes() + ":" + d.getSeconds();};
            }
        }
    }
  }

  module.exports = new kotools();

}).call(this,require("VCmEsw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/kotools.js","/")
},{"VCmEsw":4,"buffer":1}]},{},[12])