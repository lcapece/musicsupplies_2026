import React, { useState } from 'react';
import ProductEditPanel from './ProductEditPanel';
import { Product } from '../types';
import { Play, FileText, Code2 } from 'lucide-react';

const ProductEditPanelDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  
  // Sample product data for demonstration
  const sampleProduct: Product = {
    partnumber: 'DEMO-001',
    description: 'Professional Studio Monitor Cable',
    longdescription: `<h2>Professional Studio Monitor Cable</h2>
<p>This high-quality studio monitor cable is designed for professional audio applications. Perfect for connecting studio monitors to audio interfaces, mixing consoles, and other professional audio equipment.</p>

<h3>Key Features:</h3>
<ul>
  <li><strong>Premium Construction:</strong> Built with high-grade materials for durability</li>
  <li><strong>Low Noise:</strong> Excellent shielding reduces interference</li>
  <li><strong>Flexible Design:</strong> Easy to route and manage in studio environments</li>
  <li><strong>Gold-Plated Connectors:</strong> Ensure reliable, corrosion-resistant connections</li>
</ul>

<h3>Specifications:</h3>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <tr>
    <th style="padding: 8px; background-color: #f5f5f5;">Length</th>
    <td style="padding: 8px;">3 feet (0.9m)</td>
  </tr>
  <tr>
    <th style="padding: 8px; background-color: #f5f5f5;">Connector Type</th>
    <td style="padding: 8px;">1/4" TRS to XLR Male</td>
  </tr>
  <tr>
    <th style="padding: 8px; background-color: #f5f5f5;">Cable Gauge</th>
    <td style="padding: 8px;">20 AWG</td>
  </tr>
  <tr>
    <th style="padding: 8px; background-color: #f5f5f5;">Shielding</th>
    <td style="padding: 8px;">95% Spiral Wrap + Foil</td>
  </tr>
</table>

<h3>Applications:</h3>
<blockquote>
  <p><em>"Perfect for professional recording studios, home studios, live sound reinforcement, and broadcast applications."</em></p>
</blockquote>

<p><strong>Note:</strong> This cable is designed for balanced audio signals and provides excellent noise rejection in professional environments.</p>

<h4>Package Contents:</h4>
<ol>
  <li>1x Professional Studio Monitor Cable</li>
  <li>1x Cable Tie for Organization</li>
  <li>1x User Manual</li>
  <li>1x Warranty Card</li>
</ol>

<p style="color: #666; font-size: 0.9em; margin-top: 2em;">
  <strong>Warranty:</strong> This product comes with a 2-year manufacturer warranty against defects in materials and workmanship.
</p>`,
    price: 29.99,
    brand: 'ProAudio Solutions',
    map: 24.99,
    master_carton_price: 180.00,
    master_carton_quantity: 8,
    inventory: 150,
    upc: '123456789012',
    image: 'https://example.com/images/demo-cable.jpg'
  };

  const handleSave = (updatedProduct: Product) => {
    alert('Demo: Product changes saved successfully!');
    setShowDemo(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Product Edit Panel Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Comprehensive dual-mode HTML content management for product descriptions
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Code2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit Mode</h3>
            <p className="text-sm text-gray-600">
              Raw HTML editor with syntax highlighting, line numbers, and validation
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Mode</h3>
            <p className="text-sm text-gray-600">
              Live preview with full HTML rendering and responsive design
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Play className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Save</h3>
            <p className="text-sm text-gray-600">
              Automatic saving with change tracking and revert capabilities
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Features Included:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Radio button mode selection</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Syntax highlighting with line numbers</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Real-time HTML validation</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Auto-save functionality</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Smart edit mode detection</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Change tracking and revert</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Responsive design</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Error handling and user feedback</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => setShowDemo(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Play className="w-5 h-5 mr-2" />
          Launch Demo
        </button>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Demo Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Click "Launch Demo" to open the product edit panel</li>
          <li>Use radio buttons to select "Raw Text or HTML" or "Rendered HTML" modes</li>
          <li>Click in the text area to start editing - this will grey out the "Rendered HTML" option</li>
          <li>Click "Done Editing" to exit edit mode and re-enable the preview option</li>
          <li>In Raw Text mode, modify the HTML content and see real-time validation</li>
          <li>In Rendered HTML mode, see how the HTML renders with full styling</li>
          <li>Try making changes and observe the auto-save functionality</li>
          <li>Use the "Revert Changes" button to undo modifications</li>
          <li>Save your changes or cancel to close the panel</li>
        </ol>
      </div>

      {/* Product Edit Panel */}
      {showDemo && (
        <ProductEditPanel
          product={sampleProduct}
          isOpen={showDemo}
          onClose={() => setShowDemo(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ProductEditPanelDemo;