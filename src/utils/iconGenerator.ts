import OpenAI from 'openai';

// Initialize OpenAI client function (lazy initialization)
const createOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Allow browser usage
  });
};

export interface CategoryIconRequest {
  categoryName: string;
  subcategoryName?: string;
  isMainCategory: boolean;
}

export class IconGenerator {
  private static async generatePrompt(request: CategoryIconRequest): Promise<string> {
    const { categoryName, subcategoryName, isMainCategory } = request;
    
    if (isMainCategory) {
      return `Create a simple, clean, minimalist icon representing "${categoryName}" for a music store, in the style of a monochromatic black and white SVG line art. 
              The icon should have no gradients, shadows, or complex textures. No text.
              It needs to be suitable for e-commerce category navigation, instantly recognizable, and represent the music equipment category. 
              The design must be clear and legible even when scaled down to very small icon sizes like 50x50 pixels. Avoid intricate details.`;
    } else {
      // Subcategory prompt can also be updated if this feature is used for them later.
      return `Create a simple, clean, minimalist icon representing "${subcategoryName}" in the "${categoryName}" category for a music store, in the style of a monochromatic black and white SVG line art. 
              The icon should have no gradients, shadows, or complex textures. No text.
              It needs to be suitable for e-commerce subcategory navigation, 
              instantly recognizable, and represent the specific music equipment item.
              The design must be clear and legible even when scaled down to very small icon sizes like 50x50 pixels. Avoid intricate details.`;
    }
  }

  static async generateCategoryIcon(request: CategoryIconRequest, apiKey: string): Promise<string | null> {
    try {
      const openai = createOpenAIClient(apiKey);
      const prompt = await this.generatePrompt(request);
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024", // DALL-E 3 minimum size, we'll resize later
        quality: "standard",
        style: "natural"
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E');
      }

      return imageUrl;
    } catch (error) {
      console.error('Error generating icon:', error);
      return null;
    }
  }

  static async downloadImage(imageUrl: string, fileName: string): Promise<string | null> {
    try {
      // For browser environment, we'll just return the URL
      // In a real implementation, you'd need a backend API to handle file downloads
      return imageUrl;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  static async generateAllCategoryIcons(apiKey: string): Promise<void> {
    // Import category data
    const { categoryTreeData } = await import('../data/categoryTree');
    
    
    for (const mainCategory of categoryTreeData) {
      try {
        // Generate main category icon
        
        const mainIconUrl = await this.generateCategoryIcon({
          categoryName: mainCategory.name,
          isMainCategory: true
        }, apiKey);

        if (mainIconUrl) {
          const mainFileName = `main_${mainCategory.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
          await this.downloadImage(mainIconUrl, mainFileName);
          
          // Wait a bit to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Generate subcategory icons
        if (mainCategory.children && mainCategory.children.length > 0) {
          for (const subCategory of mainCategory.children) {
            
            const subIconUrl = await this.generateCategoryIcon({
              categoryName: mainCategory.name,
              subcategoryName: subCategory.name,
              isMainCategory: false
            }, apiKey);

            if (subIconUrl) {
              const subFileName = `sub_${subCategory.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
              await this.downloadImage(subIconUrl, subFileName);
              
              // Wait a bit to respect API rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (error) {
        console.error(`Error generating icons for category ${mainCategory.name}:`, error);
      }
    }
    
  }

  static async generateSingleIcon(categoryName: string, apiKey: string, subcategoryName?: string): Promise<string | null> {
    
    const iconUrl = await this.generateCategoryIcon({
      categoryName,
      subcategoryName,
      isMainCategory: !subcategoryName
    }, apiKey);

    if (iconUrl) {
      const fileName = subcategoryName 
        ? `sub_${subcategoryName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        : `main_${categoryName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
      
      const success = await this.downloadImage(iconUrl, fileName);
      return success ? iconUrl : null; // Return the URL directly since we can't save files in browser
    }

    return null;
  }
}

// Helper function to update CategoryTree component to use generated images
export const updateCategoryTreeWithGeneratedIcons = () => {
  const instructions = `
To use the generated icons in your CategoryTree component:

1. Replace the SVG icons with image tags:

Instead of:
const getCategoryIcon = (categoryName: string) => {
  const Icon = CategoryIcons[categoryName];
  if (Icon) {
    return <Icon className="w-6 h-6 text-red-600" />;
  }
  return <DefaultIcon />;
};

Use:
const getCategoryIcon = (categoryName: string) => {
  const iconPath = \`/icons/main_\${categoryName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.png\`;
  return (
    <img 
      src={iconPath} 
      alt={categoryName}
      className="w-6 h-6"
      onError={(e) => {
        // Fallback to default icon if generated image doesn't exist
        e.currentTarget.src = '/icons/default_category.png';
      }}
    />
  );
};

2. Similarly for subcategories:
const getSubcategoryIcon = (categoryName: string) => {
  const iconPath = \`/icons/sub_\${categoryName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.png\`;
  return (
    <img 
      src={iconPath} 
      alt={categoryName}
      className="w-5 h-5"
      onError={(e) => {
        e.currentTarget.src = '/icons/default_subcategory.png';
      }}
    />
  );
};
`;

  return instructions;
};

// Export a utility to run icon generation from admin panel
export const runIconGeneration = async (apiKey: string) => {
  try {
    await IconGenerator.generateAllCategoryIcons(apiKey);
    return { success: true, message: 'All icons generated successfully!' };
  } catch (error) {
    console.error('Icon generation failed:', error);
    return { success: false, message: `Icon generation failed: ${error}` };
  }
};
