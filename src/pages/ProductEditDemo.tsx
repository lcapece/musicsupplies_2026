import React from 'react';
import ProductEditPanelDemo from '../components/ProductEditPanelDemo';

const ProductEditDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <ProductEditPanelDemo />
      </div>
    </div>
  );
};

export default ProductEditDemo;