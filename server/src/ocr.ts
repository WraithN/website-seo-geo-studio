// 本地 OCR：用 tesseract.js（纯 wasm，无需系统二进制）识别上传的截图文本。
// 主要给「需求调研」步骤用——用户上传 SimilarWeb / Semrush 等指标截图，
// 跑模型前先把图里的数字/指标识别出来，注入 prompt 参与商业价值分析。
//
// 注意：首次运行会从 CDN 下载英文语言包（eng.traineddata，约 10MB）到 CACHE_DIR。
// 离线或下载失败时不抛异常，而是返回 ok:false 并保留空文本，由上层降级处理。
import path from 'node:path';
import fs from 'node:fs';
import { DATA_DIR } from './db.js';

const CACHE_DIR = path.join(DATA_DIR, 'tessdata');
fs.mkdirSync(CACHE_DIR, { recursive: true });

let worker: any = null;
let warmup: Promise<any> | null = null;

async function getWorker() {
  if (worker) return worker;
  if (!warmup) {
    warmup = (async () => {
      const { createWorker } = await import('tesseract.js');
      const w = await createWorker('eng', 1, {
        cachePath: CACHE_DIR,
        errorHandler: (e: any) => {
          // 仅日志记录，不中断流程
          console.warn('[ocr] tesseract warning:', String(e?.message || e).slice(0, 160));
        },
      });
      return w;
    })();
  }
  worker = await warmup;
  return worker;
}

/**
 * 识别一张图片里的文字。
 * @returns ok 成功与否；text 识别文本（失败/无内容时为空串）
 */
export async function ocrFile(filePath: string): Promise<{ ok: boolean; text: string }> {
  if (!fs.existsSync(filePath)) return { ok: false, text: '' };
  try {
    const w = await getWorker();
    const { data } = await w.recognize(filePath);
    const text = (data.text || '').trim();
    return { ok: true, text };
  } catch (e: any) {
    console.warn('[ocr] recognize failed:', String(e?.message || e).slice(0, 200));
    return { ok: false, text: '' };
  }
}
