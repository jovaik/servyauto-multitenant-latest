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
      await extractDataFromImage(selectedFile)
    }
  }

  // Canvas drawing
  useEffect(() => {
    if (!showCropper || !canvasRef.current || !imageRef.current || !corners) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current

    // Ajustar tamaño del canvas al contenedor
    const container = canvas.parentElement
    if (!container) return

    const maxWidth = container.clientWidth
    const maxHeight = 600
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)

    canvas.width = img.width * scale
    canvas.height = img.height * scale

    // Dibujar imagen
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Dibujar overlay semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar área seleccionada
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.moveTo(corners.topLeft.x * scale, corners.topLeft.y * scale)
    ctx.lineTo(corners.topRight.x * scale, corners.topRight.y * scale)
    ctx.lineTo(corners.bottomRight.x * scale, corners.bottomRight.y * scale)
    ctx.lineTo(corners.bottomLeft.x * scale, corners.bottomLeft.y * scale)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Dibujar bordes
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(corners.topLeft.x * scale, corners.topLeft.y * scale)
    ctx.lineTo(corners.topRight.x * scale, corners.topRight.y * scale)
    ctx.lineTo(corners.bottomRight.x * scale, corners.bottomRight.y * scale)
    ctx.lineTo(corners.bottomLeft.x * scale, corners.bottomLeft.y * scale)
    ctx.closePath()
    ctx.stroke()

    // Dibujar puntos de esquina
    const cornerKeys: (keyof Corners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
    cornerKeys.forEach((key) => {
      const corner = corners[key]
      ctx.beginPath()
      ctx.arc(corner.x * scale, corner.y * scale, 12, 0, 2 * Math.PI)
      ctx.fillStyle = '#10b981'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }, [showCropper, corners])

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !corners) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = imageSize.width / canvas.width
    const scaleY = imageSize.height / canvas.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Buscar esquina más cercana
    const threshold = 30
    const cornerKeys: (keyof Corners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
    
    for (const key of cornerKeys) {
      const corner = corners[key]
      const distance = Math.hypot(corner.x - x, corner.y - y)
      
      if (distance < threshold) {
        setDraggingCorner(key)
        break
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingCorner || !canvasRef.current || !corners) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = imageSize.width / canvas.width
    const scaleY = imageSize.height / canvas.height
    const x = Math.max(0, Math.min((e.clientX - rect.left) * scaleX, imageSize.width))
    const y = Math.max(0, Math.min((e.clientY - rect.top) * scaleY, imageSize.height))

    setCorners({
      ...corners,
      [draggingCorner]: { x, y }
    })
  }

  const handleCanvasMouseUp = () => {
    setDraggingCorner(null)
  }

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
            <p className="text-sm text-gray-400 mb-4">
              Arrastra los puntos verdes para ajustar las esquinas del documento
            </p>
            
            <div className="relative bg-black rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
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
