/**
 * PDF.js transfers its input ArrayBuffer to its worker. Never pass the byte
 * array that React state owns directly to it, because that transfer detaches
 * the state array's backing buffer.
 */
export function copyBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) {
    return data.slice();
  }

  return new Uint8Array(data.slice(0));
}

/** PDF headers may be preceded by up to 1 KiB of binary/comment data. */
export function hasPdfHeader(data: Uint8Array): boolean {
  const limit = Math.min(data.byteLength - 4, 1024);

  for (let index = 0; index <= limit; index += 1) {
    if (
      data[index] === 0x25 && // %
      data[index + 1] === 0x50 && // P
      data[index + 2] === 0x44 && // D
      data[index + 3] === 0x46 && // F
      data[index + 4] === 0x2d // -
    ) {
      return true;
    }
  }

  return false;
}
