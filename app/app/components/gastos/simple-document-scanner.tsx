'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Loader2, Camera, Crop, X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import type { ExtractedInvoiceData, Point } from '@/types/invoice-types'
import { applyPerspectiveTransform, detectDocumentCorners } from '@/lib/perspective-transform'

export interface SimpleDocumentScannerProps {
  onExtractedDataChange?: (data: ExtractedInvoiceData) => void
  onFileSelect?: (file: File) => void
  className?: string
}

interface Corners {
  topLeft: Point
  topRight: Point
  bottomRight: Point
  bottomLeft: Point
}

export function SimpleDocumentScanner({
  onExtractedDataChange,
  onFileSelect,
  className = ''
}: SimpleDocumentScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [originalPreview, setOriginalPreview] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [corners, setCorners] = useState<Corners | null>(null)
  const [draggingCorner, setDraggingCorner] = useState<keyof Corners | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📁 [SCANNER] Archivo seleccionado:', file.name, file.type, file.size)

    try {
      // Convertir PDF a JPG si es necesario
      let fileToProcess = file
      
      if (file.type === 'application/pdf') {
        toast.loading('📄 Convirtiendo PDF a imagen...', { id: 'pdf-convert' })
        fileToProcess = await convertPDFToImage(file)
        toast.success('✅ PDF convertido', { id: 'pdf-convert' })
      }

      setSelectedFile(fileToProcess)
      onFileSelect?.(fileToProcess)
      
      // Generar preview y detectar bordes
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        setPreview(dataUrl)
        setOriginalPreview(dataUrl)
        
        // Cargar imagen para obtener dimensiones
        const img = new window.Image()
        img.onload = async () => {
          setImageSize({ width: img.width, height: img.height })
          imageRef.current = img
          
          // Detectar bordes automáticamente
          await detectAndShowBorders(fileToProcess, img.width, img.height)
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(fileToProcess)
    } catch (error) {
      console.error('❌ [SCANNER] Error al procesar archivo:', error)
      toast.error('❌ Error al procesar el documento')
    }
  }

  const detectAndShowBorders = async (file: File, width: number, height: number) => {
    setIsDetecting(true)
    toast.loading('🔍 Detectando bordes del documento...', { id: 'detect' })

    try {
      const detectedCorners = await detectDocumentCorners(file, width, height)
      
      if (detectedCorners) {
        setCorners(detectedCorners)
        setShowCropper(true)
        toast.success('✅ Bordes detectados! Ajusta si es necesario', { id: 'detect' })
      } else {
        // Si no se detectan bordes, usar toda la imagen
        setCorners({
          topLeft: { x: width * 0.05, y: height * 0.05 },
          topRight: { x: width * 0.95, y: height * 0.05 },
          bottomRight: { x: width * 0.95, y: height * 0.95 },
          bottomLeft: { x: width * 0.05, y: height * 0.95 }
        })
        setShowCropper(true)
        toast.success('✅ Ajusta los bordes manualmente', { id: 'detect' })
      }
    } catch (error) {
      console.error('❌ Error al detectar bordes:', error)
      toast.error('❌ Error en la detección. Procesa sin recorte', { id: 'detect' })
      // Procesar sin cropper
      await extractDataFromImage(file)
    } finally {
      setIsDetecting(false)
    }
  }

  const applyCropAndExtract = async () => {
    if (!selectedFile || !corners) return

    setIsProcessing(true)
    toast.loading('✂️ Recortando documento...', { id: 'crop' })

    try {
      const { blob } = await applyPerspectiveTransform(selectedFile, corners)
      const croppedFile = new File([blob], selectedFile.name, { type: 'image/jpeg' })
      
      toast.success('✅ Documento recortado', { id: 'crop' })
      setShowCropper(false)
      onFileSelect?.(croppedFile)
      
      // Actualizar preview con imagen recortada
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(croppedFile)
      
      // Extraer datos del documento recortado
      await extractDataFromImage(croppedFile)
    } catch (error) {
      console.error('❌ Error al recortar:', error)
      toast.error('❌ Error al recortar. Procesando original', { id: 'crop' })
      await extractDataFromImage(selectedFile)
    }
  }

  const skipCrop = async () => {
    setShowCropper(false)
    if (selectedFile) {
      onFileSelect?.(selectedFile)
      setPreview(originalPreview)
      await extractDataFromImage(selectedFile)
    }
  }

  // ===== Recorte: esquinas arrastrables con dedo o ratón (pointer events) =====
  const cropBoxRef = useRef<HTMLDivElement>(null)

  const pointToImage = (clientX: number, clientY: number): Point | null => {
    const box = cropBoxRef.current
    if (!box || !imageSize.width) return null
    const rect = box.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * imageSize.width
    const y = ((clientY - rect.top) / rect.height) * imageSize.height
    return {
      x: Math.max(0, Math.min(x, imageSize.width)),
      y: Math.max(0, Math.min(y, imageSize.height)),
    }
  }

  const startDrag = (key: keyof Corners) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    setDraggingCorner(key)
  }

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingCorner) return
    e.preventDefault()
    const p = pointToImage(e.clientX, e.clientY)
    if (!p) return
    setCorners((prev) => (prev ? { ...prev, [draggingCorner]: p } : prev))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId) } catch {}
    setDraggingCorner(null)
  }

  const resetCorners = (full: boolean) => {
    const { width, height } = imageSize
    const m = full ? 0 : 0.05
    setCorners({
      topLeft: { x: width * m, y: height * m },
      topRight: { x: width * (1 - m), y: height * m },
      bottomRight: { x: width * (1 - m), y: height * (1 - m) },
      bottomLeft: { x: width * m, y: height * (1 - m) },
    })
  }

  const pct = (p: Point) => ({
    left: `${(p.x / (imageSize.width || 1)) * 100}%`,
    top: `${(p.y / (imageSize.height || 1)) * 100}%`,
  })

  const convertPDFToImage = async (pdfFile: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const pdfjsLib = (window as any).pdfjsLib
      if (!pdfjsLib) {
        reject(new Error('PDF.js no está cargado'))
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const pdfData = new Uint8Array(e.target?.result as ArrayBuffer)
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
          const page = await pdf.getPage(1)
          
          const viewport = page.getViewport({ scale: 2.0 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise

          canvas.toBlob((blob) => {
            if (blob) {
              const imageFile = new File([blob], pdfFile.name.replace('.pdf', '.jpg'), {
                type: 'image/jpeg'
              })
              resolve(imageFile)
            } else {
              reject(new Error('Error al convertir PDF a imagen'))
            }
          }, 'image/jpeg', 0.95)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(pdfFile)
    })
  }

  const extractDataFromImage = async (file: File) => {
    setIsProcessing(true)
    toast.loading('🔍 Extrayendo datos del documento...', { id: 'ocr' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/gastos/extract-invoice-data', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error en la extracción de datos')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        toast.success('✅ Datos extraídos correctamente', { id: 'ocr' })
        onExtractedDataChange?.(result.data)
      } else {
        throw new Error(result.error || 'No se pudieron extraer datos')
      }
    } catch (error: any) {
      console.error('❌ [SCANNER] Error en OCR:', error)
      toast.error(`❌ ${error.message}`, { id: 'ocr' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Upload Area */}
      {!showCropper && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isProcessing || isDetecting}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center justify-center"
          >
            {preview && !showCropper ? (
              <div className="relative w-full max-w-md">
                <Image
                  src={preview}
                  alt="Vista previa"
                  width={400}
                  height={300}
                  className="rounded-lg object-contain max-h-64"
                />
              </div>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                  <span className="font-semibold text-blue-600 hover:text-blue-500">
                    Subir factura o ticket
                  </span>
                  <p className="pl-1">o arrastrar aquí</p>
                </div>
                <p className="text-xs leading-5 text-gray-600">
                  PNG, JPG, PDF hasta 10MB
                </p>
              </>
            )}
          </label>
        </div>
      )}

      {/* Cropper Canvas */}
      {showCropper && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crop className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">
                  Ajusta los bordes del documento
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Arrastra los 4 puntos verdes (con el dedo o el ratón) hasta las esquinas del documento
            </p>
            <div className="flex gap-2 mb-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => resetCorners(true)}>
                Toda la imagen
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => resetCorners(false)}>
                Restablecer
              </Button>
            </div>

            <div className="flex justify-center bg-black rounded-lg p-4">
              <div
                ref={cropBoxRef}
                className="relative inline-block select-none"
                style={{ touchAction: 'none' }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreview || preview}
                  alt="Documento a recortar"
                  draggable={false}
                  className="block max-w-full max-h-[60vh] w-auto h-auto pointer-events-none"
                />
                {corners && (
                  <>
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${imageSize.width || 1} ${imageSize.height || 1}`}
                      preserveAspectRatio="none"
                    >
                      <path
                        fillRule="evenodd"
                        fill="rgba(0,0,0,0.55)"
                        d={`M0 0H${imageSize.width}V${imageSize.height}H0Z M${corners.topLeft.x} ${corners.topLeft.y}L${corners.topRight.x} ${corners.topRight.y}L${corners.bottomRight.x} ${corners.bottomRight.y}L${corners.bottomLeft.x} ${corners.bottomLeft.y}Z`}
                      />
                      <polygon
                        points={`${corners.topLeft.x},${corners.topLeft.y} ${corners.topRight.x},${corners.topRight.y} ${corners.bottomRight.x},${corners.bottomRight.y} ${corners.bottomLeft.x},${corners.bottomLeft.y}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={3}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as (keyof Corners)[]).map((key) => (
                      <div
                        key={key}
                        onPointerDown={startDrag(key)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center cursor-grab active:cursor-grabbing"
                        style={{ ...pct(corners[key]), touchAction: 'none' }}
                        aria-label={`Esquina ${key}`}
                      >
                        <div
                          className={`rounded-full border-2 border-white bg-green-500 shadow-lg transition-transform ${
                            draggingCorner === key ? 'w-7 h-7 scale-110' : 'w-6 h-6'
                          }`}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={applyCropAndExtract}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Recortar y Escanear
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={skipCrop}
              disabled={isProcessing}
              variant="outline"
            >
              <X className="h-4 w-4 mr-2" />
              Omitir Recorte
            </Button>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isDetecting && (
        <div className="flex items-center justify-center p-4 bg-purple-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600 mr-2" />
          <span className="text-sm text-purple-700">
            Detectando bordes automáticamente...
          </span>
        </div>
      )}

      {isProcessing && !showCropper && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">
            Extrayendo datos del documento...
          </span>
        </div>
      )}

      {/* Rescan Button */}
      {selectedFile && !isProcessing && !showCropper && !isDetecting && (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => {
              if (selectedFile && imageSize.width > 0) {
                detectAndShowBorders(selectedFile, imageSize.width, imageSize.height)
              }
            }}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Crop className="h-4 w-4" />
            Ajustar Recorte
          </Button>
        </div>
      )}
    </div>
  )
}
