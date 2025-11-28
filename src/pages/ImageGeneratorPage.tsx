import React from 'react'
import GeminiImageGenerator from '../components/GeminiImageGenerator'

const ImageGeneratorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <GeminiImageGenerator />
      </div>
    </div>
  )
}

export default ImageGeneratorPage
