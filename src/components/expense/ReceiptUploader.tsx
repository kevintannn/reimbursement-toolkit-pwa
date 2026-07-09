import { useRef, useState } from 'react'
import { compressImage } from '../../utils/image'

interface ReceiptUploaderProps {
  onImage: (blob: Blob) => void
}

export function ReceiptUploader({ onImage }: ReceiptUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const compressed = await compressImage(file)
    const url = URL.createObjectURL(compressed)
    setPreview(url)
    onImage(compressed)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => { if (!preview) fileRef.current?.click() }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'
        } ${!preview ? 'cursor-pointer' : ''}`}
      >
        {preview ? (
          <img
            src={preview}
            alt="Receipt preview"
            onClick={(e) => { e.stopPropagation(); window.open(preview, '_blank') }}
            className="max-h-48 mx-auto rounded-lg object-contain cursor-zoom-in"
          />
        ) : (
          <div className="space-y-1">
            <div className="text-3xl">🧾</div>
            <p className="text-sm font-medium text-slate-600">Drop receipt here or tap to browse</p>
            <p className="text-xs text-slate-400">JPEG, PNG, WEBP accepted</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          📷 Camera
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          📁 Gallery
        </button>
      </div>
    </div>
  )
}
