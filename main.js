// --- MOCK BACKEND & API (Simulates a Node.js/Express server with MongoDB) ---
const mockApi = (() => {
    const mockDb = {
        users: [{id: 1, name: 'Test User', email: 'test@example.com', password: 'password123'}],
        reviews: [],
        orders: {}, 
    };

    // Helper to simulate network delay
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const api = {
        async signup(name, email, password) {
            await delay(500);
            if (mockDb.users.find(u => u.email === email)) {
                throw new Error("Email already in use.");
            }
            const newUser = { id: Date.now(), name, email, password };
            mockDb.users.push(newUser);
            const token = `mock_token_${newUser.id}`;
            return { user: { id: newUser.id, name: newUser.name, email: newUser.email }, token };
        },

        async login(email, password) {
            await delay(500);
            const user = mockDb.users.find(u => u.email === email && u.password === password);
            if (!user) {
                throw new Error("Invalid credentials.");
            }
            const token = `mock_token_${user.id}`;
            return { user: { id: user.id, name: user.name, email: user.email }, token };
        },

        async checkSession(token) {
            await delay(200);
            if (!token || !token.startsWith('mock_token_')) return null;
            const userId = parseInt(token.replace('mock_token_', ''));
            const user = mockDb.users.find(u => u.id === userId);
            return user ? { id: user.id, name: user.name, email: user.email } : null;
        },

        async getReviews(productId) {
            await delay(400);
            return mockDb.reviews.filter(r => r.productId === productId);
        },

        async addReview(productId, rating, text, user) {
            await delay(600);
            if (!user) throw new Error("Authentication required.");
            const newReview = {
                productId,
                rating,
                text,
                author: user.name, // Use user's name
                createdAt: new Date().toISOString()
            };
            mockDb.reviews.push(newReview);
            return newReview;
        },

        async addOrder(cart, totalAmount, user) {
            await delay(1000);
            if (!user) throw new Error("Authentication required.");
            const orderId = `order_${Date.now()}`;
            const newOrder = {
                id: orderId,
                items: cart,
                totalAmount,
                status: 'Processing',
                createdAt: new Date()
            };
            if (!mockDb.orders[user.id]) {
                mockDb.orders[user.id] = [];
            }
            mockDb.orders[user.id].push(newOrder);
            return newOrder;
        },

        async getOrders(user) {
            await delay(800);
            if (!user) throw new Error("Authentication required.");
            return mockDb.orders[user.id] || [];
        }
    };
    return api;
})();

// --- GLOBAL STATE ---
let currentUser = null;
let cart = [];
const products = [
    // Groceries & Essentials
    { id: 1, name: 'Basmati Rice (1kg)', price: 120.00, imageUrl: 'assets/Rice.jpg', category: 'Groceries & Essentials', description: 'Long-grain Basmati rice known for its fragrance and delicate flavour.', rating: 4.2, reviews: [{ author: 'Sunita P.', text: 'Excellent quality for biryani!' }, { author: 'Rohan K.', text: 'A staple in our household now.' }, { author: 'Meera J.', text: 'Packaging was good and delivery was on time.' }] },
    { id: 2, name: 'Whole Wheat Flour (5kg)', price: 250.00, imageUrl: 'assets/Flour.jpg', category: 'Groceries & Essentials', description: 'Freshly milled whole wheat atta, perfect for soft rotis and chapatis.', rating: 4.9, reviews: [{ author: 'Rajesh K.', text: 'Very soft rotis.' }, { author: 'Vivek T.', text: 'The quality is consistently great.' }, { author: 'Aisha P.', text: 'Highly recommended to everyone.' }, { author: 'Karan V.', text: 'Good quality product, very satisfied.' }] },
    { id: 3, name: 'Toor Dal (1kg)', price: 140.00, imageUrl: 'assets/Dal.jpg', category: 'Groceries & Essentials', description: 'High-quality Toor Dal, rich in protein and essential nutrients.', rating: 3.8, reviews: [{ author: 'Priya S.', text: 'Good quality product, very satisfied.' }, { author: 'Arjun M.', text: 'Value for money. Will buy again.' }] },
    { id: 4, name: 'Sunflower Oil (1L)', price: 180.00, imageUrl: 'assets/Oil.jpg', category: 'Groceries & Essentials', description: 'Refined sunflower oil, light and healthy for everyday cooking.', rating: 4.5, reviews: [{ author: 'Anjali M.', text: 'Good for daily cooking.' }, { author: 'Diya G.', text: 'Exactly what I was looking for.' }, { author: 'Aditya N.', text: 'Decent product for the price.' }, { author: 'Sneha R.', text: 'Fresh and tasty, just as expected.' }] },
    { id: 5, name: 'Turmeric Powder (200g)', price: 50.00, imageUrl: 'assets/Spices.jpg', category: 'Groceries & Essentials', description: 'Pure and aromatic turmeric powder with high curcumin content.', rating: 5.0, reviews: [{ author: 'Karan V.', text: 'The quality is consistently great.' }, { author: 'Meera J.', text: 'Highly recommended to everyone.' }] },
    { id: 6, name: 'Tata Salt (1kg)', price: 25.00, imageUrl: 'assets/Salt.jpg', category: 'Groceries & Essentials', description: 'Iodized salt for your daily needs.', rating: 4.8, reviews: [{ author: 'Aisha P.', text: 'A staple in our household now.' }, { author: 'Vivek T.', text: 'Good quality product, very satisfied.' }, { author: 'Pooja G.', text: 'Exactly what I was looking for.' }] },
    { id: 7, name: 'Sugar (1kg)', price: 45.00, imageUrl: 'assets/Sugar.jpg', category: 'Groceries & Essentials', description: 'Refined crystal sugar for your beverages and sweets.', rating: 3.2, reviews: [{ author: 'Amit B.', text: 'Could be better, but it\'s okay.' }, { author: 'Swati R.', text: 'Decent product for the price.' }] },
    { id: 8, name: 'Tata Tea Gold (500g)', price: 280.00, imageUrl: 'assets/Tea.jpg', category: 'Groceries & Essentials', description: 'A perfect blend of long leaves and CTC for a rich and aromatic tea experience.', rating: 4.9, reviews: [{ author: 'Vikram S.', text: 'My morning starts with this tea.' }, { author: 'Rohan K.', text: 'Highly recommended to everyone.' }, { author: 'Priya S.', text: 'The quality is consistently great.' }, { author: 'Aditya N.', text: 'Value for money. Will buy again.' }, { author: 'Anjali M.', text: 'Good quality product, very satisfied.' }] },
    { id: 9, name: 'Parle-G Biscuits', price: 10.00, imageUrl: 'assets/Biscuits.jpg', category: 'Groceries & Essentials', description: 'The classic glucose biscuits, loved by all ages.', rating: 5.0, reviews: [{ author: 'Everyone', text: 'An undisputed classic!' }, { author: 'Arjun M.', text: 'Perfect with tea.' }, { author: 'Diya G.', text: 'A staple in our household now.' }] },
    { id: 10, name: 'Amul Fresh Milk (500ml)', price: 28.00, imageUrl: 'assets/Milk.jpg', category: 'Dairy & Bakery', description: 'Pasteurised toned milk, a great source of calcium.', rating: 4.7, reviews: [{ author: 'Sneha R.', text: 'Fresh and tasty, just as expected.' }, { author: 'Sunita P.', text: 'Good quality product, very satisfied.' }] },
    { id: 11, name: 'Fresh Paneer (200g)', price: 80.00, imageUrl: 'assets/Paneer.jpg', category: 'Dairy & Bakery', description: 'Soft and fresh cottage cheese, perfect for Indian curries.', rating: 4.8, reviews: [{ author: 'Pooja G.', text: 'Very soft and tasty.' }, { author: 'Rajesh K.', text: 'Value for money. Will buy again.' }, { author: 'Vikram S.', text: 'The quality is consistently great.' }] },
    { id: 12, name: 'Amul Butter (100g)', price: 55.00, imageUrl: 'assets/Butter.jpg', category: 'Dairy & Bakery', description: 'The delicious taste of Amul butter for your toast and parathas.', rating: 4.9, reviews: [{ author: 'Meera J.', text: 'A staple in our household now.' }, { author: 'Amit B.', text: 'Good quality product, very satisfied.' }] },
    { id: 13, name: 'Brown Bread', price: 40.00, imageUrl: 'assets/Bread.jpg', category: 'Dairy & Bakery', description: 'Healthy and wholesome brown bread, ideal for sandwiches.', rating: 3.5, reviews: [{ author: 'Neha V.', text: 'Decent product for the price.' }, { author: 'Karan V.', text: 'Could be better, but it\'s okay.' }, { author: 'Swati R.', text: 'Fresh and tasty, just as expected.' }] },
    { id: 14, name: 'Banana (6 pcs)', price: 40.00, imageUrl: 'assets/Banana.jpg', category: 'Fruits & Vegetables', description: 'Fresh and ripe bananas, a great source of energy.', rating: 4.6, reviews: [{ author: 'Aditya N.', text: 'Fresh and tasty, just as expected.' }, { author: 'Aisha P.', text: 'Good quality product, very satisfied.' }] },
    { id: 15, name: 'Tomato (1kg)', price: 30.00, imageUrl: 'assets/Tomato.jpg', category: 'Fruits & Vegetables', description: 'Juicy and red tomatoes for your salads and curries.', rating: 3.4, reviews: [{ author: 'Priya S.', text: 'Could be better, but it\'s okay.' }] },
    { id: 16, name: 'Onion (1kg)', price: 35.00, imageUrl: 'assets/Onion.jpg', category: 'Fruits & Vegetables', description: 'Fresh onions, an essential ingredient in Indian cooking.', rating: 4.5, reviews: [{ author: 'Amit B.', text: 'Good quality onions.' }, { author: 'Sunita P.', text: 'A staple in our household now.' }, { author: 'Rohan K.', text: 'Value for money. Will buy again.' }] },
    { id: 17, name: 'Potato (1kg)', price: 25.00, imageUrl: 'assets/Potato.jpg', category: 'Fruits & Vegetables', description: 'Versatile potatoes for all your cooking needs.', rating: 4.1, reviews: [{ author: 'Vivek T.', text: 'Good quality product, very satisfied.' }, { author: 'Anjali M.', text: 'Exactly what I was looking for.' }] },
    { id: 18, name: 'Lifebuoy Soap (125g)', price: 30.00, imageUrl: 'assets/Soap.jpg', category: 'Personal Care & Hygiene', description: 'Total 10 germ protection soap for you and your family.', rating: 4.7, reviews: [{ author: 'Arjun M.', text: 'A staple in our household now.' }, { author: 'Diya G.', text: 'Value for money. Will buy again.' }] },
    { id: 19, name: 'Clinic Plus Shampoo (175ml)', price: 95.00, imageUrl: 'assets/Shampoo.jpg', category: 'Personal Care & Hygiene', description: 'With milk protein for healthy and strong hair.', rating: 4.0, reviews: [{ author: 'Sneha R.', text: 'Good quality product, very satisfied.' }, { author: 'Pooja G.', text: 'Decent product for the price.' }] },
    { id: 20, name: 'Colgate Toothpaste (100g)', price: 55.00, imageUrl: 'assets/Toothpaste.jpg', category: 'Personal Care & Hygiene', description: 'Complete oral care for strong teeth and fresh breath.', rating: 4.8, reviews: [{ author: 'Swati R.', text: 'A trusted brand.' }, { author: 'Rajesh K.', text: 'Highly recommended to everyone.' }, { author: 'Meera J.', text: 'The quality is consistently great.' }] },
    { id: 21, name: 'Surf Excel Detergent (1kg)', price: 150.00, imageUrl: 'assets/Detergent.jpg', category: 'Household Essentials', description: 'Tough stain removal for your laundry.', rating: 4.8, reviews: [{ author: 'Vikram S.', text: 'The quality is consistently great.' }, { author: 'Neha V.', text: 'Value for money. Will buy again.' }] },
    { id: 22, name: 'Vim Dishwash Liquid (500ml)', price: 105.00, imageUrl: 'assets/Dishwash.jpg', category: 'Household Essentials', description: 'Removes tough grease and leaves utensils sparkling clean.', rating: 4.7, reviews: [{ author: 'Karan V.', text: 'Good quality product, very satisfied.' }, { author: 'Priya S.', text: 'A staple in our household now.' }, { author: 'Aditya N.', text: 'Exactly what I was looking for.' }] },
    { id: 23, name: 'Pampers Diapers (M, 20pcs)', price: 350.00, imageUrl: 'assets/Diapers.jpg', category: 'Baby & Kids', description: 'Soft and comfortable diapers for your baby\'s delicate skin.', rating: 4.9, reviews: [{ author: 'Neha V.', text: 'Very absorbent and soft.' }, { author: 'Aisha P.', text: 'Highly recommended to everyone.' }, { author: 'Rohan K.', text: 'The quality is consistently great.' }] },
    { id: 24, name: 'Johnson\'s Baby Soap (100g)', price: 70.00, imageUrl: 'assets/BabySoap.jpg', category: 'Baby & Kids', description: 'Mild and gentle soap, perfect for baby\'s bath time.', rating: 4.3, reviews: [{ author: 'Diya G.', text: 'Good quality product, very satisfied.' }, { author: 'Arjun M.', text: 'Decent product for the price.' }] },
    { id: 25, name: 'Maggi Noodles (70g)', price: 14.00, imageUrl: 'assets/Noodles.jpg', category: 'Beverages & Packaged Foods', description: 'Your favorite 2-minute masala noodles.', rating: 4.9, reviews: [{ author: 'Vivek T.', text: 'A staple in our household now.' }, { author: 'Sneha R.', text: 'Exactly what I was looking for.' }, { author: 'Anjali M.', text: 'Value for money. Will buy again.' }] },
    { id: 26, name: 'Lays Chips (Classic)', price: 20.00, imageUrl: 'assets/Chips.jpg', category: 'Beverages & Packaged Foods', description: 'Classic salted potato chips, a perfect snack.', rating: 4.7, reviews: [{ author: 'Sunita P.', text: 'Good quality product, very satisfied.' }, { author: 'Rajesh K.', text: 'Fresh and tasty, just as expected.' }] },
    { id: 27, name: 'Dettol Antiseptic (125ml)', price: 80.00, imageUrl: 'assets/Antiseptic.jpg', category: 'Health & Wellness', description: 'Trusted antiseptic liquid for first aid and personal hygiene.', rating: 4.9, reviews: [{ author: 'Pooja G.', text: 'A staple in our household now.' }, { author: 'Vikram S.', text: 'Highly recommended to everyone.' }] },
    { id: 28, name: 'Band-Aid (20 strips)', price: 40.00, imageUrl: 'assets/Band-Aid.jpg', category: 'Health & Wellness', description: 'Waterproof adhesive bandages for cuts and scrapes.', rating: 4.4, reviews: [{ author: 'Amit B.', text: 'Exactly what I was looking for.' }, { author: 'Swati R.', text: 'Value for money. Will buy again.' }, { author: 'Meera J.', text: 'Good quality product, very satisfied.' }] }
];

// --- DOM ELEMENTS ---
const getEl = (id) => document.getElementById(id);
const productGrid = getEl('product-grid');
const cartSidebar = getEl('cart-sidebar');
const cartOverlay = getEl('cart-overlay');
const openCartBtn = getEl('open-cart-btn');
const closeCartBtn = getEl('close-cart-btn');
const cartItemsContainer = getEl('cart-items');
const emptyCartMessage = getEl('empty-cart-message');
const cartItemCount = getEl('cart-item-count');
const cartTotal = getEl('cart-total');
const checkoutBtn = getEl('checkout-btn');
const checkoutLoginPrompt = getEl('checkout-login-prompt');

const modalContainer = document.querySelector('.modal-container');
const modalOverlay = getEl('modal-overlay');
const productModal = getEl('product-modal');
const supportModal = getEl('support-modal');
const checkoutModal = getEl('checkout-modal');

const searchInput = getEl('search-input');
const sortSelect = getEl('sort-select');
const categorySelect = getEl('category-select');
const openSupportBtn = getEl('open-support-btn');

// Auth elements
const authContainer = getEl('auth-container');
const userContainer = getEl('user-container');
const loginBtn = getEl('login-btn');
const signupBtn = getEl('signup-btn');
const accountBtn = getEl('account-btn');
const logoutBtn = getEl('logout-btn');
const loginModal = getEl('login-modal');
const signupModal = getEl('signup-modal');
const accountModal = getEl('account-modal');

// --- AUTHENTICATION ---
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            currentUser = await mockApi.checkSession(token);
        } catch (error) {
            console.error("Session check failed:", error);
            localStorage.removeItem('authToken');
            currentUser = null;
        }
    }
    updateUIForAuthState();
}

function handleLogout() {
    localStorage.removeItem('authToken');
    currentUser = null;
    updateUIForAuthState();
}

function updateUIForAuthState() {
    if (currentUser) {
        authContainer.classList.add('hidden');
        userContainer.classList.remove('hidden');
        userContainer.classList.add('flex');
        checkoutLoginPrompt.classList.add('hidden');
    } else {
        authContainer.classList.remove('hidden');
        userContainer.classList.add('hidden');
        userContainer.classList.remove('flex');
        if (cart.length > 0) {
             checkoutLoginPrompt.classList.remove('hidden');
        }
    }
}

// --- RENDER FUNCTIONS ---
function displayProducts() {
    let filteredProducts = [...products];

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    
    const selectedCategory = categorySelect.value;
    if (selectedCategory && selectedCategory !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
    }

    const sortValue = sortSelect.value;
    switch (sortValue) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    renderProducts(filteredProducts);
}

function renderProducts(productsToRender) {
    productGrid.innerHTML = '';
    if (productsToRender.length === 0) {
        productGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No products found.</p>`;
        return;
    }
    productsToRender.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer transform hover:-translate-y-1 transition-transform duration-300';
        productCard.dataset.productId = product.id;
        productCard.innerHTML = `
            <div class="flex-grow">
                <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-lg font-semibold">${product.name}</h3>
                    <div class="flex items-center mt-1">
                        <div class="star-rating">${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}</div>
                        <span class="text-xs text-gray-500 ml-2">(${product.reviews.length} reviews)</span>
                    </div>
                    <p class="text-gray-600 mt-2 mb-4">₹${product.price.toFixed(2)}</p>
                </div>
            </div>
            <div class="p-4 pt-0">
                <button data-product-id="${product.id}" class="add-to-cart-btn w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                    Add to Cart
                </button>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
}

function renderCart() {
    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
        emptyCartMessage.classList.remove('hidden');
         checkoutLoginPrompt.classList.add('hidden');
    } else {
        emptyCartMessage.classList.add('hidden');
        if (!currentUser) {
            checkoutLoginPrompt.classList.remove('hidden');
        }
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'flex items-center justify-between mb-4';
            cartItem.innerHTML = `
                <div class="flex items-center">
                    <img src="${item.imageUrl}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md mr-4">
                    <div>
                        <h4 class="font-semibold">${item.name}</h4>
                        <p class="text-gray-500">₹${item.price.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <button data-product-id="${item.id}" class="quantity-change-btn p-1 text-lg">-</button>
                    <span class="mx-2">${item.quantity}</span>
                    <button data-product-id="${item.id}" class="quantity-change-btn p-1 text-lg">+</button>
                    <button data-product-id="${item.id}" class="remove-item-btn ml-4 text-red-500 hover:text-red-700">
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
    }
    updateCartSummary();
}

function renderCategories() {
    const categories = ['All', ...new Set(products.map(p => p.category))];
    categorySelect.innerHTML = categories.map(cat => `
        <option value="${cat}">${cat}</option>
    `).join('');
}

function updateCartSummary() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartItemCount.textContent = totalItems;
    cartTotal.textContent = `₹${totalPrice.toFixed(2)}`;
    checkoutBtn.disabled = cart.length === 0;
}

function renderAuthModal(type) {
    const isLogin = type === 'login';
    const modal = isLogin ? loginModal : signupModal;
    const nameField = isLogin ? '' : `
        <div class="mb-4">
            <label for="signup-name" class="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" id="signup-name" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
        </div>
    `;

    modal.innerHTML = `
        <h3 class="text-2xl font-bold mb-4 text-center">${isLogin ? 'Login' : 'Sign Up'}</h3>
        <form id="${type}-form">
            ${nameField}
            <div class="mb-4">
                <label for="${type}-email" class="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" id="${type}-email" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            </div>
            <div class="mb-6">
                <label for="${type}-password" class="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" id="${type}-password" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            </div>
            <p id="${type}-error" class="text-red-500 text-sm mb-4 text-center"></p>
            <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700">${isLogin ? 'Login' : 'Create Account'}</button>
        </form>
        <button data-close-modal class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
    `;
    openModal(modal);

    getEl(`${type}-form`).addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = getEl(`${type}-email`).value;
        const password = getEl(`${type}-password`).value;
        const errorEl = getEl(`${type}-error`);
        const submitBtn = e.target.querySelector('button[type="submit"]');
        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            let result;
            if (isLogin) {
                result = await mockApi.login(email, password);
            } else {
                const name = getEl('signup-name').value;
                result = await mockApi.signup(name, email, password);
            }
            
            const { user, token } = result;
            localStorage.setItem('authToken', token);
            currentUser = user;
            updateUIForAuthState();
            closeModal();
        } catch (error) {
            errorEl.textContent = error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLogin ? 'Login' : 'Create Account';
        }
    });
}


// --- CART LOGIC ---
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    renderCart();
}

function updateQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            removeFromCart(productId);
        } else {
            renderCart();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

function toggleCart(open) {
    if (open) {
        cartSidebar.classList.remove('cart-closed');
        cartSidebar.classList.add('cart-open');
        cartOverlay.classList.remove('hidden');
    } else {
        cartSidebar.classList.add('cart-closed');
        cartSidebar.classList.remove('cart-open');
        cartOverlay.classList.add('hidden');
    }
}

// --- MODAL & UI LOGIC ---
function openModal(modal) {
    modal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
    modalContainer.classList.remove('modal-hidden');
    modalContainer.classList.add('modal-visible');
}

function closeModal() {
    modalContainer.classList.add('modal-hidden');
    modalContainer.classList.remove('modal-visible');
    modalOverlay.classList.add('hidden');
    modalContainer.querySelectorAll('.bg-white').forEach(m => m.classList.add('hidden'));
}

async function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Fetch reviews from our mock API
    const dbReviews = await mockApi.getReviews(productId);
    const allReviews = [...product.reviews, ...dbReviews];

    productModal.innerHTML = `
        <div class="flex flex-col md:flex-row max-h-[90vh]">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full md:w-1/2 h-64 md:h-auto object-cover rounded-l-lg">
            <div class="p-6 flex-grow flex flex-col overflow-y-auto custom-scrollbar">
                <div class="flex-grow">
                    <h3 class="text-2xl font-bold mb-2">${product.name}</h3>
                    <div class="flex items-center mb-4">
                        <div class="star-rating">${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}</div>
                        <span class="text-sm text-gray-600 ml-2">(${product.rating.toFixed(1)} stars)</span>
                    </div>
                    <p class="text-gray-700 mb-4">${product.description}</p>
                    <div class="text-3xl font-bold text-indigo-600 mb-4">₹${product.price.toFixed(2)}</div>
                    <h4 class="font-semibold mb-2">Reviews (${allReviews.length})</h4>
                    <div id="reviews-list" class="text-sm text-gray-600 border-t pt-2 space-y-3 mb-4">
                        ${allReviews.length > 0 ? allReviews.map(r => `<div><strong>${r.author}:</strong> "${r.text}"</div>`).join('') : '<em>No reviews yet.</em>'}
                    </div>
                    
                    <div id="review-form-container"></div>
                </div>
                <div class="mt-6 flex gap-4 sticky bottom-0 bg-white py-4 border-t">
                     <button data-product-id="${product.id}" class="add-to-cart-btn flex-grow bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">Add to Cart</button>
                     <button data-close-modal class="flex-grow bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300">Close</button>
                </div>
            </div>
        </div>
    `;
    openModal(productModal);
    renderReviewForm(productId);
}

function renderReviewForm(productId) {
    const container = getEl('review-form-container');
    if (!currentUser) {
        container.innerHTML = `<p class="text-sm text-center bg-gray-100 p-4 rounded-md">Please <button id="review-login-btn" class="font-bold text-indigo-600 hover:underline">log in</button> to write a review.</p>`;
        getEl('review-login-btn').addEventListener('click', () => {
            closeModal();
            renderAuthModal('login');
        });
    } else {
        container.innerHTML = `
            <form id="review-form">
                <h5 class="font-semibold mb-2">Write a review</h5>
                 <div class="flex items-center mb-2" id="review-star-rating">
                    ${[1,2,3,4,5].map(i => `<span class="star-rating-input text-2xl text-gray-300" data-value="${i}">☆</span>`).join('')}
                </div>
                <input type="hidden" id="review-rating-value" value="0">
                <textarea id="review-text" rows="3" required placeholder="Share your thoughts..." class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                <button type="submit" class="mt-2 bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-600">Submit Review</button>
            </form>
        `;
        
        const reviewForm = getEl('review-form');
        const starRatingContainer = getEl('review-star-rating');

        starRatingContainer.addEventListener('click', e => {
            if(e.target.classList.contains('star-rating-input')) {
                const rating = e.target.dataset.value;
                getEl('review-rating-value').value = rating;
                const stars = starRatingContainer.querySelectorAll('.star-rating-input');
                stars.forEach(star => {
                    star.innerHTML = star.dataset.value <= rating ? '★' : '☆';
                    star.classList.toggle('text-yellow-400', star.dataset.value <= rating);
                    star.classList.toggle('text-gray-300', star.dataset.value > rating);
                });
            }
        });

        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = parseInt(getEl('review-rating-value').value);
            const text = getEl('review-text').value;
            
            if (rating === 0 || !text) {
                alert("Please provide a rating and a comment.");
                return;
            }

            try {
                await mockApi.addReview(productId, rating, text, currentUser);
                // Refresh reviews
                await openProductModal(productId);
            } catch (error) {
                console.error("Error adding review: ", error);
                alert("Failed to submit review.");
            }
        });
    }
}

async function openAccountModal() {
    accountModal.innerHTML = `
        <div class="p-6 border-b flex justify-between items-center">
            <h3 class="text-2xl font-bold">My Account</h3>
            <button data-close-modal class="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <div class="p-6 flex-grow overflow-y-auto custom-scrollbar">
             <p class="mb-4">Welcome, <strong>${currentUser.name}</strong></p>
             <h4 class="text-xl font-bold mb-4">My Orders</h4>
             <div id="orders-list" class="space-y-4">
                 <p>Loading orders...</p>
             </div>
        </div>
    `;
    openModal(accountModal);
    
    const ordersList = getEl('orders-list');
    try {
        const orders = await mockApi.getOrders(currentUser);
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p>You have not placed any orders yet.</p>';
            return;
        }

        let ordersHTML = '';
        orders.forEach(order => {
            const orderDate = order.createdAt?.toLocaleDateString() || 'N/A';
            ordersHTML += `
                <div class="border rounded-lg p-4 bg-gray-50">
                    <div class="flex justify-between items-center mb-2">
                        <p class="font-bold">Order #${order.id.substring(0, 12)}</p>
                        <span class="text-sm px-2 py-1 rounded-full bg-yellow-200 text-yellow-800">${order.status}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">Date: ${orderDate}</p>
                    <p class="font-semibold mb-2">Total: ₹${order.totalAmount.toFixed(2)}</p>
                    <div class="text-sm">
                        ${order.items.map(item => `<div>${item.quantity} x ${item.name}</div>`).join('')}
                    </div>
                </div>
            `;
        });
        ordersList.innerHTML = ordersHTML;

    } catch (error) {
        console.error("Error fetching orders:", error);
        ordersList.innerHTML = '<p class="text-red-500">Could not load orders.</p>';
    }
}

// --- EVENT LISTENERS ---
openCartBtn.addEventListener('click', () => toggleCart(true));
closeCartBtn.addEventListener('click', () => toggleCart(false));
cartOverlay.addEventListener('click', () => toggleCart(false));
searchInput.addEventListener('input', displayProducts);
sortSelect.addEventListener('change', displayProducts);
categorySelect.addEventListener('change', displayProducts);

// Auth listeners
loginBtn.addEventListener('click', () => renderAuthModal('login'));
signupBtn.addEventListener('click', () => renderAuthModal('signup'));
logoutBtn.addEventListener('click', handleLogout);
accountBtn.addEventListener('click', openAccountModal);

document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productId = parseInt(e.target.dataset.productId);
        addToCart(productId);
        return;
    }
    
    const productCard = e.target.closest('[data-product-id].cursor-pointer');
    if (productCard && !e.target.closest('button')) {
        openProductModal(parseInt(productCard.dataset.productId));
        return;
    }

    const cartButton = e.target.closest('.quantity-change-btn, .remove-item-btn');
    if(cartButton) {
         const productId = parseInt(cartButton.dataset.productId);
         if (cartButton.classList.contains('quantity-change-btn')) {
            const change = cartButton.textContent === '+' ? 1 : -1;
            updateQuantity(productId, change);
         } else if (cartButton.classList.contains('remove-item-btn')) {
            removeFromCart(productId);
         }
         return;
    }
});

openSupportBtn.addEventListener('click', () => openModal(supportModal));

modalContainer.addEventListener('click', e => {
    if (e.target.hasAttribute('data-close-modal') || e.target.closest('[data-close-modal]')) {
        closeModal();
    }
});

modalOverlay.addEventListener('click', closeModal);

checkoutBtn.addEventListener('click', async () => {
    if (!currentUser) {
        checkoutLoginPrompt.classList.remove('hidden');
        return;
    }
    
    if (cart.length > 0) {
        try {
            const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            await mockApi.addOrder(cart, totalAmount, currentUser);
            
            cart = [];
            renderCart();
            
            toggleCart(false);
            openModal(checkoutModal);

        } catch (error) {
            console.error("Error creating order: ", error);
            alert("There was an error placing your order. Please try again.");
        }
    }
});

// --- INITIALIZATION ---
async function init() {
    await checkAuthStatus();
    renderCategories();
    displayProducts();
    renderCart();
}

init();