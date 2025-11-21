'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Loader2, Camera } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'
import type { ExtractedInvoiceData } from '@/types/invoice-types'

export interface SimpleDocumentScannerProps {
  onExtractedDataChange?: (data: ExtractedInvoiceData) => void
  onFileSelect?: (file: File) => void
  className?: string
}

export function SimpleDocumentScanner({
  onExtractedDataChange,
  onFileSelect,
  className = ''
}: SimpleDocumentScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

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

      // Generar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(fileToProcess)

      setSelectedFile(fileToProcess)
      onFileSelect?.(fileToProcess)
      
      // Procesar automáticamente
      await extractDataFromImage(fileToProcess)
    } catch (error) {
      console.error('❌ [SCANNER] Error al procesar archivo:', error)
      toast.error('❌ Error al procesar el documento')
    }
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
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
        >
          {preview ? (
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

      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-blue-700">
            Procesando documento...
          </span>
        </div>
      )}

      {selectedFile && !isProcessing && (
        <div className="flex justify-center">
          <Button
            onClick={() => extractDataFromImage(selectedFile)}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Volver a Escanear
          </Button>
        </div>
      )}
    </div>
  )
}
