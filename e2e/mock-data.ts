/**
 * Shared mock data for E2E tests.
 * All data structures match the backend API response format.
 */

export const MOCK_USER = {
  id: 'test-user-1',
  email: 'testuser@example.com',
  name: 'Test User',
  phone: '+86 138 0000 0000',
  role: 'user' as const,
  preferredLanguage: 'en' as const,
  preferredCurrency: 'CNY' as const,
};

export const MOCK_ACCESS_TOKEN = 'eyJmock-access-token-for-testing';
export const MOCK_REFRESH_TOKEN = 'eyJmock-refresh-token-for-testing';

export const MOCK_AUTH_REGISTER_RESPONSE = {
  success: true,
  data: {
    user: MOCK_USER,
    tokens: {
      access_token: MOCK_ACCESS_TOKEN,
      expires_in: 3600,
    },
  },
};

export const MOCK_AUTH_LOGIN_RESPONSE = {
  success: true,
  data: {
    user: MOCK_USER,
    tokens: {
      access_token: MOCK_ACCESS_TOKEN,
      expires_in: 3600,
    },
  },
};

export const MOCK_AUTH_ME_RESPONSE = {
  success: true,
  data: { user: MOCK_USER },
};

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    platform: 'amazon',
    platformName: 'Amazon',
    title: 'Japanese Matcha Green Tea Powder 100g',
    titleZh: '日本抹茶绿茶粉 100g',
    titleEn: 'Japanese Matcha Green Tea Powder 100g',
    description: 'Premium quality Japanese matcha green tea powder.',
    priceJpy: 2580,
    priceCny: 128.50,
    priceUsd: 18.00,
    currency: 'JPY',
    images: [],
    rating: 4.5,
    reviewCount: 128,
    salesCount: 560,
    inStock: true,
    status: 'active',
    categoryId: 'cat-1',
    sellerName: 'MatchaShop Japan',
    slug: 'japanese-matcha-powder',
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-04-20T10:00:00Z',
  },
  {
    id: 'prod-2',
    platform: 'mercari',
    platformName: 'Mercari',
    title: 'Vintage Kimono Silk Fabric',
    titleZh: '复古和服丝绸面料',
    titleEn: 'Vintage Kimono Silk Fabric',
    description: 'Beautiful vintage kimono silk fabric in excellent condition.',
    priceJpy: 4500,
    priceCny: 224.00,
    priceUsd: 31.50,
    currency: 'JPY',
    images: [],
    rating: 4.8,
    reviewCount: 45,
    salesCount: 120,
    inStock: true,
    status: 'active',
    categoryId: 'cat-2',
    sellerName: 'Vintage Kyoto',
    slug: 'vintage-kimono-silk',
    createdAt: '2025-02-20T12:00:00Z',
    updatedAt: '2025-04-18T09:00:00Z',
  },
  {
    id: 'prod-3',
    platform: 'rakuten',
    platformName: 'Rakuten',
    title: 'Japanese Anime Figure - Limited Edition',
    titleZh: '日本动漫手办 - 限量版',
    titleEn: 'Japanese Anime Figure - Limited Edition',
    description: 'Limited edition anime figure from popular series.',
    priceJpy: 12800,
    priceCny: 637.00,
    priceUsd: 89.50,
    currency: 'JPY',
    images: [],
    rating: 4.2,
    reviewCount: 230,
    salesCount: 890,
    inStock: true,
    status: 'active',
    categoryId: 'cat-3',
    sellerName: 'Anime Collectibles',
    slug: 'anime-figure-limited',
    createdAt: '2025-03-10T15:00:00Z',
    updatedAt: '2025-04-22T11:00:00Z',
  },
  {
    id: 'prod-4',
    platform: 'yahoo',
    platformName: 'Yahoo',
    title: 'Japanese Knife Set - Chef Knife 3-Piece',
    titleZh: '日本刀具套装 - 厨师刀3件套',
    titleEn: 'Japanese Knife Set - Chef Knife 3-Piece',
    description: 'Professional Japanese chef knife set.',
    priceJpy: 22000,
    priceCny: 1095.00,
    priceUsd: 154.00,
    currency: 'JPY',
    images: [],
    rating: 4.9,
    reviewCount: 312,
    salesCount: 1500,
    inStock: true,
    status: 'active',
    categoryId: 'cat-4',
    sellerName: 'Seki Knives',
    slug: 'japanese-chef-knife-set',
    createdAt: '2025-01-05T10:00:00Z',
    updatedAt: '2025-04-25T08:00:00Z',
  },
];

export const MOCK_PRODUCTS_PAGE_RESPONSE = {
  data: MOCK_PRODUCTS,
  pagination: {
    page: 1,
    limit: 20,
    total: 4,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
};

export const MOCK_PRODUCT_DETAIL = MOCK_PRODUCTS[0];
export const MOCK_PRODUCT_DETAIL_RESPONSE = MOCK_PRODUCTS[0];

export const MOCK_PRICE_HISTORY = {
  productId: 'prod-1',
  currency: 'CNY',
  history: [
    { date: '2025-03-28', price: 132.00 },
    { date: '2025-04-01', price: 130.50 },
    { date: '2025-04-05', price: 129.00 },
    { date: '2025-04-10', price: 128.50 },
    { date: '2025-04-15', price: 127.00 },
    { date: '2025-04-20', price: 128.50 },
  ],
  statistics: {
    currentPrice: 128.50,
    lowestPrice: 127.00,
    highestPrice: 132.00,
    averagePrice: 129.25,
    priceTrend: 'stable' as const,
  },
};

export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Food and Drink', nameZh: '食品饮料', nameEn: 'Food and Drink', slug: 'food-drink' },
  { id: 'cat-2', name: 'Fashion', nameZh: '时尚', nameEn: 'Fashion', slug: 'fashion' },
  { id: 'cat-3', name: 'Hobbies', nameZh: '兴趣爱好', nameEn: 'Hobbies', slug: 'hobbies' },
  { id: 'cat-4', name: 'Kitchen', nameZh: '厨房用品', nameEn: 'Kitchen', slug: 'kitchen' },
];

export const MOCK_CART_EMPTY = null;

export const MOCK_CART_WITH_ITEMS = {
  id: 'cart-1',
  items: [
    {
      id: 'cart-item-1',
      product: {
        id: 'prod-1',
        title: 'Japanese Matcha Green Tea Powder 100g',
        coverImage: 'https://m.media-amazon.com/images/test-matcha.jpg',
        platform: 'amazon',
        priceJpy: 2580,
        priceCny: 128.50,
      },
      quantity: 2,
      unitPriceJpy: 2580,
      unitPriceCny: 128.50,
      subtotalJpy: 5160,
      subtotalCny: 257.00,
      options: {},
      buyerMessage: '',
      seller: { id: 'seller-1', name: 'MatchaShop Japan' },
    },
    {
      id: 'cart-item-2',
      product: {
        id: 'prod-2',
        title: 'Vintage Kimono Silk Fabric',
        coverImage: 'https://static.mercdn.net/test-kimono.jpg',
        platform: 'mercari',
        priceJpy: 4500,
        priceCny: 224.00,
      },
      quantity: 1,
      unitPriceJpy: 4500,
      unitPriceCny: 224.00,
      subtotalJpy: 4500,
      subtotalCny: 224.00,
      options: {},
      buyerMessage: '',
      seller: { id: 'seller-2', name: 'Vintage Kyoto' },
    },
  ],
  summary: {
    totalItems: 3,
    subtotalJpy: 9660,
    subtotalCny: 481.00,
    subtotalUsd: 67.31,
    estimatedShippingJpy: 1500,
    estimatedShippingCny: 74.67,
    totalJpy: 11160,
    totalCny: 555.67,
    currency: 'CNY',
  },
  groupedBySeller: [
    {
      seller: { id: 'seller-1', name: 'MatchaShop Japan' },
      items: [
        {
          id: 'cart-item-1',
          product: {
            id: 'prod-1',
            title: 'Japanese Matcha Green Tea Powder 100g',
            coverImage: 'https://m.media-amazon.com/images/test-matcha.jpg',
            platform: 'amazon',
            priceJpy: 2580,
            priceCny: 128.50,
          },
          quantity: 2,
          unitPriceJpy: 2580,
          unitPriceCny: 128.50,
          subtotalJpy: 5160,
          subtotalCny: 257.00,
          options: {},
          buyerMessage: '',
          seller: { id: 'seller-1', name: 'MatchaShop Japan' },
        },
      ],
      subtotal: 257.00,
    },
    {
      seller: { id: 'seller-2', name: 'Vintage Kyoto' },
      items: [
        {
          id: 'cart-item-2',
          product: {
            id: 'prod-2',
            title: 'Vintage Kimono Silk Fabric',
            coverImage: 'https://static.mercdn.net/test-kimono.jpg',
            platform: 'mercari',
            priceJpy: 4500,
            priceCny: 224.00,
          },
          quantity: 1,
          unitPriceJpy: 4500,
          unitPriceCny: 224.00,
          subtotalJpy: 4500,
          subtotalCny: 224.00,
          options: {},
          buyerMessage: '',
          seller: { id: 'seller-2', name: 'Vintage Kyoto' },
        },
      ],
      subtotal: 224.00,
    },
  ],
};

export const MOCK_CART_UPDATED = {
  ...MOCK_CART_WITH_ITEMS,
  items: MOCK_CART_WITH_ITEMS.items.map(function(item) {
    return item.id === 'cart-item-1'
      ? Object.assign({}, item, { quantity: 3, subtotalJpy: 7740, subtotalCny: 385.50 })
      : item;
  }),
  summary: Object.assign({}, MOCK_CART_WITH_ITEMS.summary, {
    totalItems: 4,
    subtotalJpy: 12240,
    subtotalCny: 609.50,
    totalJpy: 13740,
    totalCny: 684.17,
  }),
  groupedBySeller: MOCK_CART_WITH_ITEMS.groupedBySeller.map(function(group) {
    return group.seller.id === 'seller-1'
      ? Object.assign({}, group, { subtotal: 385.50 })
      : group;
  }),
};

export const MOCK_ADDRESSES = [
  {
    id: 'addr-1',
    recipient_name: 'John Doe',
    phone: '+86 139 0000 0000',
    country: 'CN',
    country_name: 'China',
    address_line1: '123 Beijing Road',
    address_line2: 'Unit 5',
    city: 'Shanghai',
    postal_code: '200000',
    label: 'Home',
    is_default: true,
  },
  {
    id: 'addr-2',
    recipient_name: 'Jane Smith',
    phone: '+1 555 000 0000',
    country: 'US',
    country_name: 'United States',
    address_line1: '456 Broadway',
    address_line2: '',
    city: 'New York',
    postal_code: '10001',
    label: 'Office',
    is_default: false,
  },
];

export const MOCK_CREATE_ORDER_RESPONSE = {
  success: true,
  data: {
    order_id: 'order-12345',
    status: 'pending',
    total: 555.67,
    currency: 'CNY',
  },
};

export const MOCK_ORDER_DETAIL = {
  id: 'order-12345',
  status: 'pending',
  totalAmount: 555.67,
  currency: 'CNY',
  items: MOCK_CART_WITH_ITEMS.items,
  shippingAddress: MOCK_ADDRESSES[0],
  createdAt: '2025-04-28T09:15:00Z',
};
