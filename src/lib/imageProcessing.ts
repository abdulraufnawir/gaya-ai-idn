/**
 * Unified image processing pipeline:
 *  1. HEIC/HEIF → JPEG (via heic2any, async, lazy-loaded)
 *  2. AVIF/WEBP → JPEG (via canvas)
 *  3. Auto-resize to max 2048px longest side
 *  4. JPEG compress @ quality 0.85
 *
 * Reduces typical 8 MB phone photo to ~600 KB - 1.5 MB,
 * cuts mobile upload time by ~5x and storage cost meaningfully.
 */

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;
const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];
const NEEDS_TRANSCODE = ['image/avif', 'image/webp', ...HEIC_MIME_TYPES];

export interface ProcessOptions {
  maxDimension?: number;
  quality?: number;
  /** If true, always re-encode to JPEG (even if already JPEG and small). */
  forceReencode?: boolean;
}

export interface ProcessResult {
  file: File;
  originalSizeKB: number;
  processedSizeKB: number;
  wasResized: boolean;
  wasTranscoded: boolean;
}

/**
 * Detect HEIC by extension when MIME type is empty (common on iOS Safari).
 */
const isLikelyHeic = (file: File): boolean => {
  if (HEIC_MIME_TYPES.includes(file.type.toLowerCase())) return true;
  if (!file.type) {
    const name = file.name.toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif');
  }
  return false;
};

/**
 * Convert HEIC/HEIF blob to JPEG blob using heic2any (lazy-loaded).
 */
const transcodeHeic = async (file: File): Promise<Blob> => {
  // @ts-ignore — heic2any has no types
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });
  return Array.isArray(result) ? result[0] : result;
};

/**
 * Load Blob/File into HTMLImageElement.
 */
const blobToImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar untuk diproses.'));
    };
    img.src = url;
  });

/**
 * Resize + re-encode via canvas. Returns JPEG Blob.
 */
const resizeToJpeg = (
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<{ blob: Blob; resized: boolean }> => {
  const longest = Math.max(img.width, img.height);
  const resized = longest > maxDimension;
  const scale = resized ? maxDimension / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.');
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Gagal mengompres gambar.'));
        resolve({ blob, resized });
      },
      'image/jpeg',
      quality,
    );
  });
};

/**
 * Main entry point. Always returns a JPEG File.
 *
 * - HEIC/HEIF iPhone photos → transcoded then resized
 * - AVIF/WEBP → transcoded then resized
 * - Large JPG/PNG → resized + recompressed
 * - Small JPG (<1 MB, ≤maxDimension) → returned as-is unless forceReencode
 */
export const processImageForUpload = async (
  file: File,
  opts: ProcessOptions = {},
): Promise<ProcessResult> => {
  const maxDimension = opts.maxDimension ?? MAX_DIMENSION;
  const quality = opts.quality ?? JPEG_QUALITY;
  const originalSizeKB = Math.round(file.size / 1024);

  let workBlob: Blob = file;
  let wasTranscoded = false;

  // Step 1: HEIC transcode
  if (isLikelyHeic(file)) {
    try {
      workBlob = await transcodeHeic(file);
      wasTranscoded = true;
    } catch (err) {
      console.error('[imageProcessing] HEIC transcode failed', err);
      throw new Error(
        'Gagal mengonversi foto HEIC. Silakan ekspor dari iPhone sebagai JPG (Pengaturan > Kamera > Format > Most Compatible).',
      );
    }
  } else if (NEEDS_TRANSCODE.includes(file.type.toLowerCase())) {
    wasTranscoded = true; // canvas re-encode handles this
  }

  // Step 2: Load → check if resize/recompress needed
  const img = await blobToImage(workBlob);
  const longest = Math.max(img.width, img.height);
  const fitsSize = workBlob.size <= 1_000_000; // ~1 MB
  const fitsDim = longest <= maxDimension;
  const isAlreadyJpeg = workBlob.type === 'image/jpeg' || file.type === 'image/jpeg';

  if (!opts.forceReencode && fitsSize && fitsDim && isAlreadyJpeg && !wasTranscoded) {
    return {
      file,
      originalSizeKB,
      processedSizeKB: originalSizeKB,
      wasResized: false,
      wasTranscoded: false,
    };
  }

  // Step 3: Resize + JPEG compress
  const { blob, resized } = await resizeToJpeg(img, maxDimension, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  const newFile = new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return {
    file: newFile,
    originalSizeKB,
    processedSizeKB: Math.round(blob.size / 1024),
    wasResized: resized,
    wasTranscoded,
  };
};
