/**
 * 軽量顔認証ライブラリ。face-api.js を使用。
 *
 * モデル読み込み戦略:
 *   1) ローカル `/models/` (public/models/) を優先
 *   2) 失敗時は CDN (vladmandic 互換ミラー) から
 *
 * face-api.js は npm 依存に追加するか、もしくは CDN <script> として動的注入する。
 * 本実装は <script> 動的注入で完結（npm install を要求しない）。
 *
 * 出力: 128次元 Float32Array → number[] へ変換（JSONB 互換）。
 */

declare global {
  interface Window {
    faceapi?: any
  }
}

const FACE_API_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js"
const MODEL_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"

let _modelsLoaded = false
let _scriptPromise: Promise<any> | null = null

function loadFaceApiScript(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"))
  if (window.faceapi) return Promise.resolve(window.faceapi)
  if (_scriptPromise) return _scriptPromise
  _scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = FACE_API_CDN
    s.async = true
    s.crossOrigin = "anonymous"
    s.onload = () => {
      if (window.faceapi) resolve(window.faceapi)
      else reject(new Error("face-api script loaded but global missing"))
    }
    s.onerror = () => reject(new Error(`failed to load ${FACE_API_CDN}`))
    document.head.appendChild(s)
  })
  return _scriptPromise
}

export async function loadModels(modelBaseUrl: string = "/models"): Promise<void> {
  if (_modelsLoaded) return
  const faceapi = await loadFaceApiScript()
  // Try local first, fallback to CDN
  const tryBases = [modelBaseUrl, MODEL_CDN]
  let lastErr: unknown = null
  for (const base of tryBases) {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.faceLandmark68Net.loadFromUri(base),
        faceapi.nets.faceRecognitionNet.loadFromUri(base),
      ])
      _modelsLoaded = true
      return
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`face-api models failed to load: ${String(lastErr)}`)
}

export async function startCamera(videoEl: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  })
  videoEl.srcObject = stream
  await videoEl.play()
  return stream
}

export function stopCamera(stream?: MediaStream | null) {
  if (!stream) return
  stream.getTracks().forEach((t) => t.stop())
}

/**
 * 動画要素から最も顔が大きい1名の 128次元 embedding を返す。
 * 顔が見つからなければ null。
 */
export async function getEmbedding(videoEl: HTMLVideoElement): Promise<number[] | null> {
  const faceapi = window.faceapi
  if (!faceapi || !_modelsLoaded) throw new Error("models not loaded")
  const det = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
  if (!det || !det.descriptor) return null
  return Array.from(det.descriptor as Float32Array).map((v) => Number(v))
}

/**
 * 5枚撮影 → 各 embedding を平均（L2 正規化はせず単純平均、cosine 評価で吸収）。
 * enrollment 時の品質向上に使う。
 */
export async function captureAverageEmbedding(
  videoEl: HTMLVideoElement,
  samples: number = 5,
  delayMs: number = 400,
): Promise<number[] | null> {
  const collected: number[][] = []
  for (let i = 0; i < samples; i++) {
    const e = await getEmbedding(videoEl)
    if (e) collected.push(e)
    await new Promise((r) => setTimeout(r, delayMs))
  }
  if (collected.length === 0) return null
  const dim = collected[0].length
  const avg = new Array(dim).fill(0)
  for (const v of collected) for (let i = 0; i < dim; i++) avg[i] += v[i]
  for (let i = 0; i < dim; i++) avg[i] /= collected.length
  return avg
}

export const faceRecognition = {
  loadModels,
  startCamera,
  stopCamera,
  getEmbedding,
  captureAverageEmbedding,
}
