import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface VisualDiffResult {
  diffCount: number;
  diffPercentage: number;
  passed: boolean;
  diffImagePath?: string;
}

export class VisualRegressionService {
  /**
   * Compare two PNG images pixel-by-pixel.
   * Returns diff count, diff percentage, and optionally writes a diff image.
   */
  async compare(
    baselinePath: string,
    currentPath: string,
    options: {
      threshold?: number;
      diffPercentageThreshold?: number;
      outputDir: string;
    },
  ): Promise<VisualDiffResult> {
    const [baselineBuf, currentBuf] = await Promise.all([
      fs.readFile(baselinePath),
      fs.readFile(currentPath),
    ]);

    const baseline = PNG.sync.read(baselineBuf);
    const currentRaw = PNG.sync.read(currentBuf);
    let current: PNG;

    // Size mismatch: resize current image to baseline dimensions for comparison
    if (baseline.width !== currentRaw.width || baseline.height !== currentRaw.height) {
      current = this.resizePng(currentRaw, baseline.width, baseline.height);
    } else {
      current = currentRaw;
    }

    const { width, height } = baseline;
    const rawDiff = new PNG({ width, height });
    const diffCount = pixelmatch(
      baseline.data,
      current.data,
      rawDiff.data,
      width,
      height,
      { threshold: options.threshold ?? 0.1, diffMask: true },
    );

    const totalPixels = width * height;
    const diffPercentage = (diffCount / totalPixels) * 100;
    const passed = diffPercentage <= (options.diffPercentageThreshold ?? 1.0);

    // Generate a human-readable diff image:
    // Use the current screenshot as background, overlay red highlight on diff pixels,
    // and slightly dim matching regions so the differences stand out.
    const diff = this.createReadableDiff(current, rawDiff, diffCount, width, height);

    const diffImagePath = path.join(options.outputDir, `diff-${Date.now()}.png`);
    await fs.writeFile(diffImagePath, PNG.sync.write(diff));

    return { diffCount, diffPercentage, passed, diffImagePath };
  }

  /**
   * Create a human-readable diff image.
   * Uses the current screenshot as background, dims matching regions (40% opacity),
   * and highlights diff pixels in red. This allows humans to see WHERE differences
   * occur in the context of the actual page.
   */
  private createReadableDiff(
    current: PNG,
    rawDiff: PNG,
    diffCount: number,
    width: number,
    height: number,
  ): PNG {
    const diff = new PNG({ width, height });
    const channels = 4; // RGBA
    const dimAlpha = 0.4; // dim matching regions to 40% opacity

    // If no differences, just return the current screenshot as-is
    if (diffCount === 0) {
      diff.data.set(current.data);
      return diff;
    }

    for (let i = 0; i < width * height; i++) {
      const idx = i * channels;
      // With diffMask: true, pixelmatch outputs:
      //   - matching pixels: alpha = 0 (transparent)
      //   - differing pixels: alpha > 0 (opaque)
      const isDiffPixel = rawDiff.data[idx + 3] > 0;

      if (isDiffPixel) {
        // Highlight diff pixel in bright red
        diff.data[idx] = 255;     // R
        diff.data[idx + 1] = 0;   // G
        diff.data[idx + 2] = 0;   // B
        diff.data[idx + 3] = 255; // A
      } else {
        // Dim matching regions: blend current pixel with a dark background
        diff.data[idx] = Math.round(current.data[idx] * dimAlpha);
        diff.data[idx + 1] = Math.round(current.data[idx + 1] * dimAlpha);
        diff.data[idx + 2] = Math.round(current.data[idx + 2] * dimAlpha);
        diff.data[idx + 3] = 255;
      }
    }

    return diff;
  }

  /**
   * Resize a PNG image to target dimensions using nearest-neighbor interpolation.
   * Used when baseline and current screenshot have different sizes.
   */
  private resizePng(src: PNG, targetWidth: number, targetHeight: number): PNG {
    const dst = new PNG({ width: targetWidth, height: targetHeight });
    const srcW = src.width;
    const srcH = src.height;
    const channels = 4; // RGBA

    for (let y = 0; y < targetHeight; y++) {
      const srcY = Math.min(Math.floor(y * srcH / targetHeight), srcH - 1);
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(Math.floor(x * srcW / targetWidth), srcW - 1);
        const srcIdx = (srcY * srcW + srcX) * channels;
        const dstIdx = (y * targetWidth + x) * channels;
        dst.data[dstIdx] = src.data[srcIdx];         // R
        dst.data[dstIdx + 1] = src.data[srcIdx + 1]; // G
        dst.data[dstIdx + 2] = src.data[srcIdx + 2]; // B
        dst.data[dstIdx + 3] = src.data[srcIdx + 3]; // A
      }
    }

    return dst;
  }
}
