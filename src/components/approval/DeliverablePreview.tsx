/**
 * DeliverablePreview Component
 * Displays PDF, image, or link previews for approval deliverables
 */

import { useState } from 'react'
import { 
  FileText, 
  Image as ImageIcon, 
  ExternalLink, 
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button, LoadingSpinner, ErrorMessage } from '../common'
import { trackPdfPreviewOpened, trackDeliverableDownloaded } from '../../utils/analytics'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

// =============================================================================
// TYPES
// =============================================================================

export interface DeliverablePreviewProps {
  url: string
  type: 'pdf' | 'image' | 'link' | null
  projectName: string
  stage: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DeliverablePreview({
  url,
  type,
  projectName,
  stage
}: DeliverablePreviewProps) {
  // Determine type from URL if not provided
  const deliverableType = type || inferTypeFromUrl(url)

  const handleDownload = () => {
    trackDeliverableDownloaded(stage, deliverableType || 'unknown')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-700">
          {deliverableType === 'pdf' && <FileText size={20} />}
          {deliverableType === 'image' && <ImageIcon size={20} />}
          {deliverableType === 'link' && <ExternalLink size={20} />}
          <span className="font-medium">Document Preview</span>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          leftIcon={<Download size={16} />}
        >
          Download
        </Button>
      </div>

      {/* Preview content */}
      <div className="p-4">
        {deliverableType === 'pdf' && (
          <PdfPreview url={url} stage={stage} />
        )}
        
        {deliverableType === 'image' && (
          <ImagePreview url={url} alt={`${projectName} - ${stage}`} />
        )}
        
        {deliverableType === 'link' && (
          <LinkPreview url={url} />
        )}
        
        {!deliverableType && (
          <div className="text-center py-8 text-gray-500">
            <FileText size={48} className="mx-auto mb-2 opacity-50" />
            <p>Preview not available</p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              className="mt-4"
            >
              Open Document
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PDF PREVIEW
// =============================================================================

interface PdfPreviewProps {
  url: string
  stage: string
}

function PdfPreview({ url, stage }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    trackPdfPreviewOpened(stage)
  }

  const onDocumentLoadError = () => {
    setError('Failed to load PDF. Please try downloading the document.')
    setIsLoading(false)
  }

  const goToPrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1))
  const goToNextPage = () => setCurrentPage(prev => Math.min(numPages, prev + 1))
  const zoomIn = () => setScale(prev => Math.min(2, prev + 0.25))
  const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.25))

  if (error) {
    return (
      <ErrorMessage
        message={error}
        variant="warning"
        onRetry={() => {
          setError(null)
          setIsLoading(true)
        }}
      />
    )
  }

  const previewContent = (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            Page {currentPage} of {numPages}
          </span>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 2}
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </Button>

          {!isFullscreen && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              aria-label="Fullscreen"
            >
              <Maximize2 size={18} />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Document */}
      <div className="pdf-viewer bg-gray-100 rounded-lg overflow-auto max-h-[600px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <LoadingSpinner size="lg" label="Loading PDF..." />
          </div>
        )}
        
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex justify-center py-4"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg"
          />
        </Document>
      </div>
    </>
  )

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-gray-900">
          <span className="text-white font-medium">Document Preview</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="text-white hover:bg-white/10"
          >
            <X size={24} />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {previewContent}
        </div>
      </div>
    )
  }

  return previewContent
}

// =============================================================================
// IMAGE PREVIEW
// =============================================================================

interface ImagePreviewProps {
  url: string
  alt: string
}

function ImagePreview({ url, alt }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
        <p>Failed to load image</p>
      </div>
    )
  }

  const imageElement = (
    <img
      src={url}
      alt={alt}
      className={`max-w-full h-auto rounded-lg ${isFullscreen ? 'max-h-[90vh] object-contain' : 'max-h-[500px]'}`}
      onLoad={() => setIsLoading(false)}
      onError={() => {
        setIsLoading(false)
        setError(true)
      }}
    />
  )

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <LoadingSpinner size="lg" />
        </div>
      )}
      
      <div 
        className="cursor-pointer"
        onClick={() => setIsFullscreen(true)}
      >
        {imageElement}
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-lg"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>
          {imageElement}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// LINK PREVIEW
// =============================================================================

interface LinkPreviewProps {
  url: string
}

function LinkPreview({ url }: LinkPreviewProps) {
  return (
    <div className="text-center py-8">
      <ExternalLink size={48} className="mx-auto mb-4 text-gray-400" />
      <p className="text-gray-600 mb-4">
        This deliverable is hosted externally.
      </p>
      <Button
        variant="primary"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        leftIcon={<ExternalLink size={18} />}
      >
        Open Document
      </Button>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function inferTypeFromUrl(url: string): 'pdf' | 'image' | 'link' | null {
  const lowerUrl = url.toLowerCase()
  
  if (lowerUrl.endsWith('.pdf')) {
    return 'pdf'
  }
  
  if (
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.endsWith('.webp')
  ) {
    return 'image'
  }
  
  if (lowerUrl.startsWith('http')) {
    return 'link'
  }
  
  return null
}

export default DeliverablePreview
