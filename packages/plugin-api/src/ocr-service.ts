import { createWorker, type Worker } from 'tesseract.js';

export interface OcrOptions {
  lang?: 'eng' | 'chi_sim' | 'chi_sim+eng';
}

export class OcrService {
  private worker?: Worker;
  private currentLang?: string;

  /**
   * Initialize or re-use the Tesseract worker.
   * If the language changes, the old worker is terminated and a new one is created.
   */
  async initialize(lang: string = 'chi_sim+eng'): Promise<void> {
    if (this.worker && this.currentLang === lang) return;

    // Terminate existing worker if language changed
    if (this.worker) {
      await this.worker.terminate();
      this.worker = undefined;
    }

    this.worker = await createWorker(lang);
    this.currentLang = lang;
  }

  /**
   * Recognize text from an image file.
   * Returns the extracted text string.
   */
  async recognize(imagePath: string, options?: OcrOptions): Promise<string> {
    const lang = options?.lang ?? 'chi_sim+eng';
    await this.initialize(lang);

    const result = await this.worker!.recognize(imagePath);
    return result.data.text.trim();
  }

  /**
   * Terminate the worker and release resources.
   * Should be called when the test run ends.
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = undefined;
      this.currentLang = undefined;
    }
  }
}
