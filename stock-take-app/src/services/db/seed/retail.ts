export type SeedRetailItem = {
  name: string;
  brand: string;
  category: string;
  sku: string;
  color: string;
  size: string;
  aliases?: string[];
};

/** Sample retail SKUs for apparel and footwear stores. */
export const SAMPLE_RETAIL_CATALOG: SeedRetailItem[] = [
  { name: 'Air Max 90', brand: 'Nike', category: 'footwear', sku: 'NIKE-AM90-BLK-10', color: 'Black', size: '10', aliases: ['Air Max black tens'] },
  { name: 'Air Max 90', brand: 'Nike', category: 'footwear', sku: 'NIKE-AM90-WHT-10', color: 'White', size: '10' },
  { name: 'Air Max 90', brand: 'Nike', category: 'footwear', sku: 'NIKE-AM90-BLK-11', color: 'Black', size: '11' },
  { name: 'Pegasus 40', brand: 'Nike', category: 'footwear', sku: 'NIKE-PEG40-GRY-10', color: 'Grey', size: '10', aliases: ['Pegasus grey'] },
  { name: 'Pegasus 40', brand: 'Nike', category: 'footwear', sku: 'NIKE-PEG40-BLK-11', color: 'Black', size: '11' },
  { name: 'Ultraboost 23', brand: 'Adidas', category: 'footwear', sku: 'ADI-UB23-WHT-11', color: 'White', size: '11', aliases: ['Ultraboost white'] },
  { name: 'Ultraboost 23', brand: 'Adidas', category: 'footwear', sku: 'ADI-UB23-BLK-10', color: 'Black', size: '10' },
  { name: 'Stan Smith', brand: 'Adidas', category: 'footwear', sku: 'ADI-STN-WHT-9', color: 'White', size: '9' },
  { name: 'Chuck 70 High Top', brand: 'Converse', category: 'footwear', sku: 'CNV-CH70-BLK-9', color: 'Black', size: '9', aliases: ['Chuck 70'] },
  { name: 'Chuck 70 High Top', brand: 'Converse', category: 'footwear', sku: 'CNV-CH70-WHT-10', color: 'White', size: '10' },
  { name: 'Old Skool', brand: 'Vans', category: 'footwear', sku: 'VAN-OS-BLK-10', color: 'Black', size: '10' },
  { name: '574 Core', brand: 'New Balance', category: 'footwear', sku: 'NB-574-GRY-10', color: 'Grey', size: '10' },
  { name: '501 Original Fit', brand: "Levi's", category: 'denim', sku: 'LEV-501-BLU-32', color: 'Blue', size: '32', aliases: ['Levi 501 blue 32'] },
  { name: '501 Original Fit', brand: "Levi's", category: 'denim', sku: 'LEV-501-BLU-34', color: 'Blue', size: '34' },
  { name: '501 Original Fit', brand: "Levi's", category: 'denim', sku: 'LEV-501-BLK-32', color: 'Black', size: '32' },
  { name: '511 Slim Fit', brand: "Levi's", category: 'denim', sku: 'LEV-511-BLU-32', color: 'Blue', size: '32' },
  { name: 'Classic Tee', brand: 'Champion', category: 'tops', sku: 'CHP-TEE-GRY-M', color: 'Grey', size: 'M', aliases: ['Champion hoodie grey medium'] },
  { name: 'Classic Tee', brand: 'Champion', category: 'tops', sku: 'CHP-TEE-GRY-L', color: 'Grey', size: 'L' },
  { name: 'Classic Tee', brand: 'Champion', category: 'tops', sku: 'CHP-TEE-BLK-M', color: 'Black', size: 'M' },
  { name: 'Hoodie', brand: 'Champion', category: 'tops', sku: 'CHP-HDY-GRY-M', color: 'Grey', size: 'M' },
  { name: 'Hoodie', brand: 'Champion', category: 'tops', sku: 'CHP-HDY-NVY-L', color: 'Navy', size: 'L' },
  { name: 'Essentials Tee', brand: 'Hanes', category: 'tops', sku: 'HAN-TEE-WHT-L', color: 'White', size: 'L' },
  { name: 'Polo Shirt', brand: 'Lacoste', category: 'tops', sku: 'LAC-PLO-GRN-M', color: 'Green', size: 'M' },
  { name: 'Oxford Shirt', brand: 'Brooks Brothers', category: 'tops', sku: 'BB-OXF-BLU-L', color: 'Blue', size: 'L' },
  { name: 'Cargo Pant', brand: 'Carhartt', category: 'bottoms', sku: 'CAR-CGO-KHK-32', color: 'Khaki', size: '32' },
  { name: 'Cargo Pant', brand: 'Carhartt', category: 'bottoms', sku: 'CAR-CGO-BLK-34', color: 'Black', size: '34' },
  { name: 'Jogger', brand: 'Nike', category: 'bottoms', sku: 'NIKE-JOG-BLK-M', color: 'Black', size: 'M' },
  { name: 'Sports Bra', brand: 'Lululemon', category: 'activewear', sku: 'LUL-SB-BLK-S', color: 'Black', size: 'S' },
  { name: 'Align Legging', brand: 'Lululemon', category: 'activewear', sku: 'LUL-ALN-BLK-M', color: 'Black', size: 'M' },
  { name: 'Windbreaker', brand: 'The North Face', category: 'outerwear', sku: 'TNF-WB-BLK-L', color: 'Black', size: 'L' },
  { name: 'Puffer Jacket', brand: 'Patagonia', category: 'outerwear', sku: 'PAT-PUF-NVY-M', color: 'Navy', size: 'M' },
  { name: 'Denim Jacket', brand: "Levi's", category: 'outerwear', sku: 'LEV-DJK-BLU-M', color: 'Blue', size: 'M' },
  { name: 'Beanie', brand: 'Carhartt', category: 'accessories', sku: 'CAR-BNI-BLK-OS', color: 'Black', size: 'OS' },
  { name: 'Baseball Cap', brand: 'New Era', category: 'accessories', sku: 'NE-CAP-BLK-OS', color: 'Black', size: 'OS' },
  { name: 'Leather Belt', brand: 'Fossil', category: 'accessories', sku: 'FOS-BLT-BRN-34', color: 'Brown', size: '34' },
  { name: 'Crew Socks 3-Pack', brand: 'Nike', category: 'accessories', sku: 'NIKE-SOX-WHT-OS', color: 'White', size: 'OS' },
  { name: 'Running Short', brand: 'Adidas', category: 'activewear', sku: 'ADI-SHT-BLK-M', color: 'Black', size: 'M' },
  { name: 'Graphic Tee', brand: 'Supreme', category: 'tops', sku: 'SUP-GTE-RED-L', color: 'Red', size: 'L' },
  { name: 'Slim Chino', brand: 'Bonobos', category: 'bottoms', sku: 'BON-CHN-TAN-32', color: 'Tan', size: '32' },
  { name: 'Flannel Shirt', brand: 'Uniqlo', category: 'tops', sku: 'UNI-FLN-RED-M', color: 'Red', size: 'M' },
  { name: 'Chelsea Boot', brand: 'Dr. Martens', category: 'footwear', sku: 'DM-CHL-BLK-10', color: 'Black', size: '10' },
  { name: 'Sandals', brand: 'Birkenstock', category: 'footwear', sku: 'BIR-ARZ-TAN-42', color: 'Tan', size: '42' },
  { name: 'Running Shoe', brand: 'ASICS', category: 'footwear', sku: 'ASC-GEL-BLU-10', color: 'Blue', size: '10' },
  { name: 'Slides', brand: 'Adidas', category: 'footwear', sku: 'ADI-SLD-BLK-10', color: 'Black', size: '10' },
  { name: 'Cardigan', brand: 'Uniqlo', category: 'tops', sku: 'UNI-CRD-GRY-L', color: 'Grey', size: 'L' },
  { name: 'Blazer', brand: 'J.Crew', category: 'outerwear', sku: 'JC-BLZ-NVY-40', color: 'Navy', size: '40' },
  { name: 'Midi Dress', brand: 'Zara', category: 'dresses', sku: 'ZAR-DRS-BLK-M', color: 'Black', size: 'M' },
  { name: 'Crossbody Bag', brand: 'Coach', category: 'accessories', sku: 'COA-BAG-TAN-OS', color: 'Tan', size: 'OS' },
  { name: 'Backpack', brand: 'Herschel', category: 'accessories', sku: 'HER-BPK-BLK-OS', color: 'Black', size: 'OS' },
  { name: 'Sneaker Cleaner Kit', brand: 'Jason Markk', category: 'accessories', sku: 'JM-KIT-OS', color: 'N/A', size: 'OS' },
];
