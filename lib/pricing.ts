// Generate a consistent price based on meal category and ID
export function generatePrice(category?: string, id?: string): number {
    let basePrice = 199;

    if (category) {
        const cat = category.toLowerCase();
        if (cat === 'chicken') basePrice = 249;
        else if (cat === 'beef') basePrice = 299;
        else if (cat === 'seafood') basePrice = 349;
        else if (cat === 'pasta') basePrice = 229;
        else if (cat === 'vegetarian' || cat === 'vegan') basePrice = 179;
        else if (cat === 'dessert') basePrice = 129;
        else if (cat === 'starter') basePrice = 149;
        else if (cat === 'breakfast') basePrice = 99;
        else if (cat === 'side') basePrice = 89;
    }

    // Add some pseudo-random variation based on the ID (0 to +50)
    let variation = 0;
    if (id && id.length > 0) {
        const charCode = id.charCodeAt(id.length - 1);
        variation = (charCode % 6) * 10;
    }

    return basePrice + variation;
}
