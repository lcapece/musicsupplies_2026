import { Category, Product, Account } from '../types';

export const mockCategories: Category[] = [
  // Level 1 Categories
  { id: 'cat1', name: 'Electronics', parentId: null, level: 1 },
  { id: 'cat2', name: 'Office Supplies', parentId: null, level: 1 },
  { id: 'cat3', name: 'Furniture', parentId: null, level: 1 },
  
  // Level 2 Categories
  { id: 'cat1-1', name: 'Computers', parentId: 'cat1', level: 2 },
  { id: 'cat1-2', name: 'Phones', parentId: 'cat1', level: 2 },
  { id: 'cat1-3', name: 'Accessories', parentId: 'cat1', level: 2 },
  { id: 'cat2-1', name: 'Paper', parentId: 'cat2', level: 2 },
  { id: 'cat2-2', name: 'Writing Instruments', parentId: 'cat2', level: 2 },
  { id: 'cat3-1', name: 'Desks', parentId: 'cat3', level: 2 },
  { id: 'cat3-2', name: 'Chairs', parentId: 'cat3', level: 2 },
  
  // Level 3 Categories
  { id: 'cat1-1-1', name: 'Laptops', parentId: 'cat1-1', level: 3 },
  { id: 'cat1-1-2', name: 'Desktops', parentId: 'cat1-1', level: 3 },
  { id: 'cat1-2-1', name: 'Smartphones', parentId: 'cat1-2', level: 3 },
  { id: 'cat1-2-2', name: 'Feature Phones', parentId: 'cat1-2', level: 3 },
  { id: 'cat1-3-1', name: 'Cables', parentId: 'cat1-3', level: 3 },
  { id: 'cat1-3-2', name: 'Chargers', parentId: 'cat1-3', level: 3 },
  { id: 'cat2-1-1', name: 'Printer Paper', parentId: 'cat2-1', level: 3 },
  { id: 'cat2-1-2', name: 'Notebooks', parentId: 'cat2-1', level: 3 },
  { id: 'cat2-2-1', name: 'Pens', parentId: 'cat2-2', level: 3 },
  { id: 'cat2-2-2', name: 'Pencils', parentId: 'cat2-2', level: 3 },
  { id: 'cat3-1-1', name: 'Standing Desks', parentId: 'cat3-1', level: 3 },
  { id: 'cat3-1-2', name: 'Executive Desks', parentId: 'cat3-1', level: 3 },
  { id: 'cat3-2-1', name: 'Ergonomic Chairs', parentId: 'cat3-2', level: 3 },
  { id: 'cat3-2-2', name: 'Conference Chairs', parentId: 'cat3-2', level: 3 },
];

export const mockProducts: Product[] = [
  // Laptops
  { id: 'p1', name: 'Business Laptop Pro', sku: 'LAP-001', price: 899.99, categoryId: 'cat1-1-1', stock: 45, unit: 'each' },
  { id: 'p2', name: 'Ultralight Notebook', sku: 'LAP-002', price: 1299.99, categoryId: 'cat1-1-1', stock: 32, unit: 'each' },
  { id: 'p3', name: 'Workstation Laptop', sku: 'LAP-003', price: 1599.99, categoryId: 'cat1-1-1', stock: 18, unit: 'each' },
  
  // Desktops
  { id: 'p4', name: 'Office Desktop Basic', sku: 'DSK-001', price: 599.99, categoryId: 'cat1-1-2', stock: 27, unit: 'each' },
  { id: 'p5', name: 'Performance Workstation', sku: 'DSK-002', price: 1299.99, categoryId: 'cat1-1-2', stock: 15, unit: 'each' },
  
  // Smartphones
  { id: 'p6', name: 'Business Smartphone', sku: 'PHN-001', price: 699.99, categoryId: 'cat1-2-1', stock: 53, unit: 'each' },
  { id: 'p7', name: 'Enterprise Mobile Device', sku: 'PHN-002', price: 899.99, categoryId: 'cat1-2-1', stock: 41, unit: 'each' },
  
  // Feature Phones
  { id: 'p8', name: 'Basic Office Phone', sku: 'PHN-003', price: 129.99, categoryId: 'cat1-2-2', stock: 78, unit: 'each' },
  
  // Cables
  { id: 'p9', name: 'USB-C Cable 6ft', sku: 'CBL-001', price: 12.99, categoryId: 'cat1-3-1', stock: 120, unit: 'each' },
  { id: 'p10', name: 'HDMI Cable 10ft', sku: 'CBL-002', price: 18.99, categoryId: 'cat1-3-1', stock: 85, unit: 'each' },
  { id: 'p11', name: 'Ethernet Cable 25ft', sku: 'CBL-003', price: 22.99, categoryId: 'cat1-3-1', stock: 67, unit: 'each' },
  
  // Chargers
  { id: 'p12', name: 'USB-C Power Adapter', sku: 'CHG-001', price: 29.99, categoryId: 'cat1-3-2', stock: 92, unit: 'each' },
  { id: 'p13', name: 'Wireless Charging Pad', sku: 'CHG-002', price: 39.99, categoryId: 'cat1-3-2', stock: 54, unit: 'each' },
  
  // Printer Paper
  { id: 'p14', name: 'Copy Paper (Case)', sku: 'PPR-001', price: 42.99, categoryId: 'cat2-1-1', stock: 230, unit: 'case' },
  { id: 'p15', name: 'Premium Laser Paper', sku: 'PPR-002', price: 15.99, categoryId: 'cat2-1-1', stock: 175, unit: 'ream' },
  
  // Notebooks
  { id: 'p16', name: 'Legal Pad (12-pack)', sku: 'NTB-001', price: 18.99, categoryId: 'cat2-1-2', stock: 143, unit: 'pack' },
  { id: 'p17', name: 'Spiral Notebook (24-pack)', sku: 'NTB-002', price: 36.99, categoryId: 'cat2-1-2', stock: 87, unit: 'pack' },
  
  // Pens
  { id: 'p18', name: 'Ballpoint Pens (Box of 50)', sku: 'PEN-001', price: 12.99, categoryId: 'cat2-2-1', stock: 210, unit: 'box' },
  { id: 'p19', name: 'Gel Pens (Box of 24)', sku: 'PEN-002', price: 18.99, categoryId: 'cat2-2-1', stock: 165, unit: 'box' },
  
  // Pencils
  { id: 'p20', name: 'Mechanical Pencils (Box of 24)', sku: 'PCL-001', price: 14.99, categoryId: 'cat2-2-2', stock: 178, unit: 'box' },
  
  // Standing Desks
  { id: 'p21', name: 'Adjustable Standing Desk', sku: 'DSK-003', price: 399.99, categoryId: 'cat3-1-1', stock: 22, unit: 'each' },
  { id: 'p22', name: 'Electric Standing Desk', sku: 'DSK-004', price: 599.99, categoryId: 'cat3-1-1', stock: 15, unit: 'each' },
  
  // Executive Desks
  { id: 'p23', name: 'Executive Office Desk', sku: 'DSK-005', price: 799.99, categoryId: 'cat3-1-2', stock: 8, unit: 'each' },
  
  // Ergonomic Chairs
  { id: 'p24', name: 'Ergonomic Office Chair', sku: 'CHR-001', price: 249.99, categoryId: 'cat3-2-1', stock: 31, unit: 'each' },
  { id: 'p25', name: 'Premium Ergonomic Chair', sku: 'CHR-002', price: 399.99, categoryId: 'cat3-2-1', stock: 17, unit: 'each' },
  
  // Conference Chairs
  { id: 'p26', name: 'Conference Room Chair', sku: 'CHR-003', price: 149.99, categoryId: 'cat3-2-2', stock: 42, unit: 'each' },
  { id: 'p27', name: 'Executive Conference Chair', sku: 'CHR-004', price: 299.99, categoryId: 'cat3-2-2', stock: 23, unit: 'each' },
];

export const mockAccounts: Account[] = [
  {
    id: '1',
    accountNumber: 'ACC10001',
    companyName: 'Acme Corporation',
    email: 'purchasing@acme.com',
    isActive: true
  },
  {
    id: '2',
    accountNumber: 'ACC10002',
    companyName: 'Globex Industries',
    email: 'orders@globex.com',
    isActive: true
  },
  {
    id: '3',
    accountNumber: 'ACC10003',
    companyName: 'Initech Systems',
    email: 'procurement@initech.com',
    isActive: true
  }
];

// Helper function to build the category tree
export const buildCategoryTree = () => {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // First pass: create map of all categories
  mockCategories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Second pass: build the tree structure
  mockCategories.forEach(category => {
    const currentCategory = categoryMap.get(category.id);
    if (currentCategory) {
      if (category.parentId === null) {
        rootCategories.push(currentCategory);
      } else {
        const parentCategory = categoryMap.get(category.parentId);
        if (parentCategory && parentCategory.children) {
          parentCategory.children.push(currentCategory);
        }
      }
    }
  });

  return rootCategories;
};

// Helper function to get products by category ID
export const getProductsByCategory = (categoryId: string): Product[] => {
  return mockProducts.filter(product => product.categoryId === categoryId);
};

// Helper function to search products
export const searchProducts = (query: string): Product[] => {
  const lowerQuery = query.toLowerCase();
  return mockProducts.filter(product => 
    product.name.toLowerCase().includes(lowerQuery) || 
    product.sku.toLowerCase().includes(lowerQuery)
  );
};

// Helper function to search categories
export const searchCategories = (query: string): Category[] => {
  const lowerQuery = query.toLowerCase();
  return mockCategories.filter(category => 
    category.name.toLowerCase().includes(lowerQuery)
  );
};

// Helper function to validate login
export const validateLogin = (accountNumber: string, password: string): Account | null => {
  // In a real app, you would hash the password and check against a database
  // For this mock, we'll just check if the account number exists and return the account
  const account = mockAccounts.find(acc => acc.accountNumber === accountNumber && acc.isActive);
  
  // For demo purposes, any password will work if the account exists
  return account || null;
};