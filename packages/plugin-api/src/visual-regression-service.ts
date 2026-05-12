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
    const current = PNG.sync.read(currentBuf);

    // Size mismatch: fail immediately
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        diffCount: -1,
        diffPercentage: 100,
        passed: false,
      };
    }

    const { width, height } = baseline;
    const diff = new PNG({ width, height });
    const diffCount = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: options.threshold ?? 0.1 },
    );

    const totalPixels = width * height;
    const diffPercentage = (diffCount / totalPixels) * 100;
    const passed = diffPercentage <= (options.diffPercentageThreshold ?? 1.0);

    const diffImagePath = path.join(options.outputDir, `diff-${Date.now()}.png`);
    await fs.writeFile(diffImagePath, PNG.sync.write(diff));

    return { diffCount, diffPercentage, passed, diffImagePath };
  }
}
