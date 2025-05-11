// Importar produtos do arquivo products.json
let products = [];

// Carregar produtos do arquivo JSON
async function loadProducts() {
  try {
    const response = await fetch("/products.json");
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const data = await response.json();
    products = data.products;

    // Inicializar a aplicação após carregar os produtos
    initializeApp();
    return products;
  } catch (error) {
    console.error("Erro ao carregar os produtos:", error);
    // Em caso de erro, tentar carregar de outras formas ou mostrar erro
    fallbackProductLoading();
  }
}

// Método alternativo para carregar produtos em caso de falha
function fallbackProductLoading() {
  console.log("Tentando método alternativo de carregamento de produtos...");
  if (typeof window.products !== "undefined") {
    products = window.products;
    initializeApp();
  } else {
    // Mostrar erro na interface
    const homeProductsGrid = document.getElementById("home-products-grid");
    if (homeProductsGrid) {
      homeProductsGrid.innerHTML = `
        <div class="col-span-full text-center py-10">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h3 class="text-xl font-bold text-gray-800">Erro ao carregar produtos</h3>
          <p class="text-gray-600">Não foi possível carregar a lista de produtos. Por favor, atualize a página ou tente novamente mais tarde.</p>
        </div>
      `;
    }
  }
}

// Estado atual da aplicação
let currentState = {
  products: [],
  currentPage: 1,
  itemsPerPage: 9,
  selectedCategory: "all",
  selectedBrands: [],
  selectedTypes: [], // Novo campo para filtrar por tipo (original/similar)
  maxPrice: 500,
  searchQuery: "",
  sortOrder: "name-asc",
};

// Inicializar o carrinho
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Função para inicializar a aplicação
function initializeApp() {
  // Atualizar o estado com os produtos carregados
  currentState.products = [...products];

  // Verificar se estamos na página de produtos
  const productsGrid = document.getElementById("products-grid");
  if (productsGrid) {
    renderProducts();
  }

  // Verificar se estamos na página inicial e temos produtos "hot"
  const homeProductsGrid = document.getElementById("home-products-grid");
  if (homeProductsGrid) {
    loadHotProducts(homeProductsGrid);
  }

  // Garantir que o carrinho esteja carregado do localStorage
  try {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      cart = JSON.parse(savedCart);
      console.log("Carrinho carregado do localStorage:", cart);
    }
  } catch (error) {
    console.error("Erro ao carregar carrinho do localStorage:", error);
    cart = [];
  }

  // Atualizar qualquer UI baseada nos produtos
  updateCartUI();
}

// Event listeners para a página de produtos
document.addEventListener("DOMContentLoaded", function () {
  // Se os produtos já estão disponíveis, inicializar a aplicação
  if (products.length > 0) {
    initializeApp();
  }

  // Iniciar o carregamento de produtos
  loadProducts();

  // Elementos DOM - verificando se existem na página atual
  const cartIcon = document.getElementById("cart-icon");
  const cartSidebar = document.getElementById("cart-sidebar");
  const closeCart = document.getElementById("close-cart");
  const overlay = document.getElementById("overlay");
  const productsGrid = document.getElementById("products-grid");
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const cartCount = document.getElementById("cart-count");
  const checkoutBtn = document.getElementById("checkout-btn");

  // Se estamos na página de produtos
  if (productsGrid) {
    setupProductsPageListeners();
  }

  // Se estamos na página inicial, carregamos produtos "hot"
  const homeProductsGrid = document.getElementById("home-products-grid");
  if (homeProductsGrid) {
    loadHotProducts(homeProductsGrid);
  }

  // Configurar event listeners para o carrinho (comum a todas as páginas)
  setupCartListeners();
});

// Função para configurar listeners específicos da página de produtos
function setupProductsPageListeners() {
  const categoryButtons = document.querySelectorAll(".category-btn");
  const brandFilters = document.querySelectorAll(".brand-filter");
  const typeFilters = document.querySelectorAll(".type-filter"); // Novos filtros de tipo
  const priceRange = document.getElementById("price-range");
  const priceValue = document.getElementById("price-value");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");

  if (categoryButtons) {
    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setCategoryFilter(button.dataset.category);
      });
    });
  }

  if (brandFilters) {
    brandFilters.forEach((checkbox) => {
      checkbox.addEventListener("change", updateFilters);
    });
  }

  if (typeFilters) {
    typeFilters.forEach((checkbox) => {
      checkbox.addEventListener("change", updateFilters);
    });
  }

  if (priceRange) {
    priceRange.addEventListener("input", () => {
      currentState.maxPrice = parseInt(priceRange.value);
      priceValue.textContent = `R$ ${currentState.maxPrice}`;
      updateFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        currentState.searchQuery = searchInput.value.toLowerCase();
        currentState.currentPage = 1;
        updateFilters();
      }, 300)
    );
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentState.sortOrder = sortSelect.value;
      updateFilters();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", goToPrevPage);
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", goToNextPage);
  }

  // Renderizar produtos iniciais
  renderProducts();
}

// Configurar listeners para o carrinho (comum a todas as páginas)
function setupCartListeners() {
  const cartIcon = document.getElementById("cart-icon");
  const closeCart = document.getElementById("close-cart");
  const overlay = document.getElementById("overlay");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearCartBtn = document.getElementById("clear-cart-btn");

  if (cartIcon) {
    cartIcon.addEventListener("click", openCart);
  }

  if (closeCart) {
    closeCart.addEventListener("click", closeCartSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", closeCartSidebar);
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkout);
  }

  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", clearCart);
  }

  // Adicionar listeners para botões "Adicionar ao Carrinho" que já existem na página
  document.querySelectorAll(".add-to-cart-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = parseInt(this.getAttribute("data-id"));
      // Encontrar o produto pelo ID
      const product = products.find((p) => p.id === productId);
      if (product) {
        addToCart(product);
      }
    });
  });
}

// Função para carregar produtos "hot" na página inicial
function loadHotProducts(container) {
  // Filtrar apenas produtos marcados como hot
  const hotProducts = products.filter((product) => product.hot);

  // Limpar o container
  container.innerHTML = "";

  // Adicionar cada produto hot ao container
  hotProducts.forEach((product) => {
    const productCard = createProductCard(product);
    container.appendChild(productCard);
  });
}

// Criar card de produto
function createProductCard(product) {
  const card = document.createElement("div");
  card.className =
    "bg-white rounded-lg overflow-hidden shadow-md product-card transition duration-300";

  const discount = product.discount
    ? `<span class="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">-${product.discount}%</span>`
    : "";
  const tag = product.tag
    ? `<span class="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">${product.tag}</span>`
    : "";

  // Adicionar badge para tipo (original/similar)
  const typeBadge =
    product.type === "original"
      ? `<span class="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Original</span>`
      : `<span class="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">Similar</span>`;

  const priceDisplay = product.oldPrice
    ? `<div class="flex justify-between items-center">
            <span class="font-bold text-blue-600">R$ ${product.price.toFixed(
              2
            )}</span>
            <span class="text-sm text-gray-500 line-through">R$ ${product.oldPrice.toFixed(
              2
            )}</span>
          </div>`
    : `<div class="flex justify-between items-center">
            <span class="font-bold text-blue-600">R$ ${product.price.toFixed(
              2
            )}</span>
          </div>`;

  card.innerHTML = `
        <div class="relative">
            <img src="${product.image}" alt="${
    product.name
  }" class="w-full h-48 object-cover">
            ${discount || tag}
            ${typeBadge}
        </div>
        <div class="p-4">
            <h3 class="font-bold text-lg mb-1">${product.name}</h3>
            <p class="text-gray-600 text-sm mb-3">${product.description}</p>
            ${priceDisplay}
            <button class="add-to-cart-btn mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition duration-300" data-id="${
              product.id
            }">
                Adicionar ao Carrinho
            </button>
        </div>
    `;

  // Adicionar event listener para o botão de adicionar ao carrinho
  card.querySelector(".add-to-cart-btn").addEventListener("click", () => {
    addToCart(product);
  });

  return card;
}

// Renderizar produtos
function renderProducts() {
  const productsGrid = document.getElementById("products-grid");
  if (!productsGrid) return;

  // Aplicar filtros
  const filteredProducts = filterProducts();

  // Atualizar contador
  const productCount = document.getElementById("product-count");
  if (productCount) {
    productCount.textContent = filteredProducts.length;
  }

  // Calcular paginação
  const startIndex = (currentState.currentPage - 1) * currentState.itemsPerPage;
  const endIndex = startIndex + currentState.itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Limpar grade de produtos
  productsGrid.innerHTML = "";

  // Renderizar produtos
  if (paginatedProducts.length === 0) {
    productsGrid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                <h3 class="text-xl font-bold text-gray-800">Nenhum produto encontrado</h3>
                <p class="text-gray-600">Tente ajustar os filtros ou realizar uma nova busca.</p>
            </div>
        `;
  } else {
    paginatedProducts.forEach((product) => {
      const productCard = createProductCard(product);
      productsGrid.appendChild(productCard);
    });
  }

  // Atualizar paginação
  renderPagination(filteredProducts.length);
}

// Função para adicionar ao carrinho (implementação única)
function addToCart(product) {
  console.log("Adicionando ao carrinho:", product);

  // Verificar se o produto é válido
  if (!product || !product.id) {
    console.error("Produto inválido:", product);
    return;
  }

  // Verificar se o item já existe no carrinho
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity++;
    console.log("Item existente, quantidade incrementada:", existingItem);
  } else {
    // Criar novo item para o carrinho
    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || "",
      quantity: 1,
    };
    cart.push(newItem);
    console.log("Novo item adicionado:", newItem);
  }

  // Salvar no localStorage
  localStorage.setItem("cart", JSON.stringify(cart));

  // Feedback visual
  showToast(`${product.name} adicionado ao carrinho!`);

  updateCartUI();

  // Abrir carrinho automaticamente
  openCart();
}

// Atualizar apenas o contador do carrinho (usado em todas as páginas)
function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = itemCount;
  }
}

// Atualizar interface do carrinho
function updateCartUI() {
  // Atualizar contador de itens
  updateCartCount();

  // Atualizar lista de itens no carrinho
  const cartItems = document.querySelector("#cart-items");
  const emptyCartMessage = document.getElementById("empty-cart-message");
  // Limpar o conteúdo atual do carrinho
  cartItems.innerHTML = "";

  // Verificar se o carrinho está vazio
  if (cart.length === 0) {
    emptyCartMessage?.classList.remove("hidden");
    console.log("Carrinho vazio");
  } else {
    emptyCartMessage?.classList.add("hidden");
    console.log(`Renderizando ${cart.length} itens no carrinho`);

    // Adicionar cada item ao carrinho
    cart.forEach((item) => {
      const cartItem = document.createElement("div");
      cartItem.className = "flex items-center border-b pb-4 mb-4";
      cartItem.innerHTML = `
        <img src="${item.image || "#"}" alt="${
        item.name
      }" class="w-16 h-16 object-cover rounded">
        <div class="ml-3 flex-grow">
          <h4 class="font-medium text-sm">${item.name}</h4>
          <p class="text-blue-600 font-bold">R$ ${item.price.toFixed(2)}</p>
          <div class="flex items-center mt-1">
            <button class="decrement-btn bg-gray-200 px-2 rounded-l" data-id="${
              item.id
            }">-</button>
            <span class="px-2 border-y">${item.quantity}</span>
            <button class="increment-btn bg-gray-200 px-2 rounded-r" data-id="${
              item.id
            }">+</button>
          </div>
        </div>
        <button class="remove-btn text-red-500 hover:text-red-700 ml-2" data-id="${
          item.id
        }">
          <i class="fas fa-trash"></i>
        </button>
      `;

      cartItems.appendChild(cartItem);
    });

    // Adicionar event listeners para os botões
    document.querySelectorAll(".increment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        incrementItem(parseInt(btn.dataset.id));
      });
    });

    document.querySelectorAll(".decrement-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        decrementItem(parseInt(btn.dataset.id))
      );
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => removeItem(parseInt(btn.dataset.id)));
    });
  }

  // Atualizar total
  const cartTotal = document.getElementById("cart-total");
  if (cartTotal) {
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cartTotal.textContent = `R$ ${total.toFixed(2)}`;
  }
}

function filterProducts() {
  let filtered = [...products];

  // Filtrar por categoria
  if (currentState.selectedCategory !== "all") {
    filtered = filtered.filter(
      (product) => product.category === currentState.selectedCategory
    );
  }

  // Filtrar por marca
  if (currentState.selectedBrands.length > 0) {
    filtered = filtered.filter(
      (product) =>
        currentState.selectedBrands.includes(product.brand) ||
        (product.brand === "" && currentState.selectedBrands.includes("other"))
    );
  }

  // Filtrar por tipo (original/similar)
  if (currentState.selectedTypes.length > 0) {
    filtered = filtered.filter((product) =>
      currentState.selectedTypes.includes(product.type)
    );
  }

  // Filtrar por preço
  filtered = filtered.filter(
    (product) => product.price <= currentState.maxPrice
  );

  // Filtrar por busca
  if (currentState.searchQuery) {
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(currentState.searchQuery) ||
        product.description.toLowerCase().includes(currentState.searchQuery) ||
        product.category.toLowerCase().includes(currentState.searchQuery) ||
        (product.brand &&
          product.brand.toLowerCase().includes(currentState.searchQuery))
    );
  }

  // Ordenar produtos
  filtered = sortProducts(filtered, currentState.sortOrder);

  return filtered;
}

// Ordenar produtos
function sortProducts(products, sortOrder) {
  return [...products].sort((a, b) => {
    switch (sortOrder) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      default:
        return 0;
    }
  });
}

// Definir filtro de categoria
function setCategoryFilter(category) {
  currentState.selectedCategory = category;
  currentState.currentPage = 1;

  // Atualizar botões ativos
  const categoryButtons = document.querySelectorAll(".category-btn");
  categoryButtons.forEach((button) => {
    if (button.dataset.category === category) {
      button.classList.add("active");
      const productsTitle = document.getElementById("products-title");
      if (productsTitle) {
        productsTitle.textContent = button.textContent;
      }
    } else {
      button.classList.remove("active");
    }
  });

  updateFilters();
}

// Atualizar filtros e renderizar produtos
function updateFilters() {
  // Obter marcas selecionadas
  const brandFilters = document.querySelectorAll(".brand-filter");
  currentState.selectedBrands = Array.from(brandFilters)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // Obter tipos selecionados (original/similar)
  const typeFilters = document.querySelectorAll(".type-filter");
  currentState.selectedTypes = Array.from(typeFilters)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  currentState.currentPage = 1;
  renderProducts();
}

// Renderizar paginação
function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / currentState.itemsPerPage);

  // Desabilitar botões conforme necessário
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  if (prevPageBtn) {
    prevPageBtn.disabled = currentState.currentPage === 1;
    prevPageBtn.classList.toggle("opacity-50", currentState.currentPage === 1);
  }

  if (nextPageBtn) {
    nextPageBtn.disabled =
      currentState.currentPage === totalPages || totalPages === 0;
    nextPageBtn.classList.toggle(
      "opacity-50",
      currentState.currentPage === totalPages || totalPages === 0
    );
  }

  // Limpar números de páginas
  const paginationNumbers = document.getElementById("pagination-numbers");
  if (paginationNumbers) {
    paginationNumbers.innerHTML = "";

    // Adicionar números de páginas
    const maxDisplayedPages = 5;
    let startPage = Math.max(
      1,
      currentState.currentPage - Math.floor(maxDisplayedPages / 2)
    );
    let endPage = Math.min(totalPages, startPage + maxDisplayedPages - 1);

    if (endPage - startPage + 1 < maxDisplayedPages) {
      startPage = Math.max(1, endPage - maxDisplayedPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement("button");
      pageButton.className = `px-4 py-2 border rounded ${
        currentState.currentPage === i
          ? "bg-blue-600 text-white"
          : "hover:bg-blue-100"
      }`;
      pageButton.textContent = i;
      pageButton.addEventListener("click", () => goToPage(i));
      paginationNumbers.appendChild(pageButton);
    }
  }
}

// Ir para página específica
function goToPage(page) {
  currentState.currentPage = page;
  renderProducts();
  // Scroll para o topo da seção de produtos
  document
    .querySelector("#products-grid")
    .scrollIntoView({ behavior: "smooth" });
}

// Ir para página anterior
function goToPrevPage() {
  if (currentState.currentPage > 1) {
    currentState.currentPage--;
    renderProducts();
    document
      .querySelector("#products-grid")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// Ir para próxima página
function goToNextPage() {
  const filteredProducts = filterProducts();
  const totalPages = Math.ceil(
    filteredProducts.length / currentState.itemsPerPage
  );

  if (currentState.currentPage < totalPages) {
    currentState.currentPage++;
    renderProducts();
    document
      .querySelector("#products-grid")
      .scrollIntoView({ behavior: "smooth" });
  }
}

// Função de debounce para evitar muitas chamadas em inputs
function debounce(func, delay) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Incrementar quantidade de item
function incrementItem(id) {
  const item = cart.find((item) => item.id === id);
  if (item) {
    item.quantity++;
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
  }
}

// Decrementar quantidade de item
function decrementItem(id) {
  const item = cart.find((item) => item.id === id);
  if (item) {
    item.quantity--;
    if (item.quantity <= 0) {
      removeItem(id);
    } else {
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartUI();
    }
  }
}

// Remover item do carrinho
function removeItem(id) {
  cart = cart.filter((item) => item.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

// Limpar carrinho
function clearCart() {
  if (confirm("Tem certeza que deseja limpar o carrinho?")) {
    cart = [];
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
    closeCartSidebar();
  }
}

// Checkout com modal de etapas
function checkout() {
  if (cart.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  // Criar o modal de checkout com etapas
  createCheckoutModal();
}

// Função para criar o modal de checkout com etapas
function createCheckoutModal() {
  // Fechar o sidebar do carrinho primeiro
  closeCartSidebar();

  // Calcular o total do pedido
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Criar elemento de overlay
  const checkoutOverlay = document.createElement("div");
  checkoutOverlay.id = "checkout-modal-overlay";
  checkoutOverlay.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  // Criar conteúdo do modal
  const modalContent = document.createElement("div");
  modalContent.className =
    "bg-white rounded-lg shadow-xl max-w-2xl w-full relative";

  // Adicionar estrutura básica com etapas
  modalContent.innerHTML = `
    <div class="modal-header bg-blue-600 text-white py-4 px-6 rounded-t-lg flex items-center justify-between">
      <h3 class="text-xl font-bold">Finalizar Pedido</h3>
      <button id="close-checkout-modal" class="text-white hover:text-gray-200">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <!-- Indicador de Etapas -->
    <div class="step-indicator flex justify-center py-4 border-b">
      <div class="step active flex flex-col items-center mx-4" data-step="1">
        <div class="step-circle bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mb-1">1</div>
        <span class="text-xs font-medium">Seus Dados</span>
      </div>
      <div class="step flex flex-col items-center mx-4" data-step="2">
        <div class="step-circle bg-gray-300 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center mb-1">2</div>
        <span class="text-xs font-medium">Confirmação</span>
      </div>
      <div class="step flex flex-col items-center mx-4" data-step="3">
        <div class="step-circle bg-gray-300 text-gray-600 w-8 h-8 rounded-full flex items-center justify-center mb-1">3</div>
        <span class="text-xs font-medium">Enviar Pedido</span>
      </div>
    </div>
    
    <!-- Conteúdo da Etapa -->
    <div class="step-content p-6">
      <!-- Etapa 1: Formulário de Dados -->
      <div class="step-pane" id="step-1">
        <h4 class="text-lg font-semibold mb-4">Informações para Contato</h4>
        <form id="checkout-form" class="space-y-4">
          <div>
            <label for="customer-name" class="block text-sm font-medium text-gray-700 mb-1">Nome Completo*</label>
            <input type="text" id="customer-name" name="name" required 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label for="customer-phone" class="block text-sm font-medium text-gray-700 mb-1">Telefone/WhatsApp*</label>
            <input type="tel" id="customer-phone" name="phone" required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label for="customer-address" class="block text-sm font-medium text-gray-700 mb-1">Endereço (opcional)</label>
            <textarea id="customer-address" name="address" rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div>
            <label for="customer-notes" class="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea id="customer-notes" name="notes" rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alguma informação adicional para seu pedido?"></textarea>
          </div>
        </form>
      </div>
      
      <!-- Etapa 2: Confirmação -->
      <div class="step-pane hidden" id="step-2">
        <h4 class="text-lg font-semibold mb-4">Confirme seu Pedido</h4>
        
        <div class="max-h-60 overflow-y-auto mb-4 border rounded-md">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 text-gray-600 text-left">
              <tr>
                <th class="p-2">Produto</th>
                <th class="p-2">Qtd</th>
                <th class="p-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${cart
                .map(
                  (item) => `
                <tr class="border-t">
                  <td class="p-2">${item.name}</td>
                  <td class="p-2">${item.quantity}</td>
                  <td class="p-2 text-right">R$ ${(
                    item.price * item.quantity
                  ).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
            <tfoot class="bg-gray-50 font-medium">
              <tr class="border-t">
                <td class="p-2" colspan="2">Total</td>
                <td class="p-2 text-right">R$ ${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="bg-gray-600 p-3 rounded-md mb-4">
          <h5 class="font-medium mb-2">Suas Informações</h5>
          <div id="customer-info-summary" class="text-sm">
            <!-- Será preenchido com JavaScript -->
          </div>
        </div>
      </div>
      
      <!-- Etapa 3: Enviar Pedido -->
      <div class="step-pane hidden" id="step-3">
        <div class="text-center py-6">
          <div class="mb-4">
            <i class="fas fa-check-circle text-green-500 text-5xl"></i>
          </div>
          <h4 class="text-xl font-bold mb-2">Pedido Pronto!</h4>
          <p class="mb-6 text-gray-600">Seu pedido está pronto para ser enviado para a Cleber Impressoras via WhatsApp.</p>
          
          <a id="send-whatsapp-btn" href="#" target="_blank" 
            class="inline-flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
            <i class="fab fa-whatsapp mr-2 text-xl"></i>
            Enviar Pedido via WhatsApp
          </a>
        </div>
      </div>
    </div>
    
    <!-- Botões de navegação -->
    <div class="modal-footer bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between">
      <button id="prev-step-btn" class="px-4 py-2 bg-gray-600 text-gray-50 rounded hover:bg-gray-800 hidden">
        <i class="fas fa-arrow-left mr-1"></i> Voltar
      </button>
      <button id="next-step-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Continuar <i class="fas fa-arrow-right ml-1"></i>
      </button>
    </div>
  `;

  // Adicionar à página
  checkoutOverlay.appendChild(modalContent);
  document.body.appendChild(checkoutOverlay);

  // Configurar navegação entre etapas
  setupCheckoutModalNavigation(checkoutOverlay);
}

// Função para configurar a navegação entre etapas no modal
function setupCheckoutModalNavigation(modalOverlay) {
  let currentStep = 1;
  const totalSteps = 3;

  const closeBtn = modalOverlay.querySelector("#close-checkout-modal");
  const prevBtn = modalOverlay.querySelector("#prev-step-btn");
  const nextBtn = modalOverlay.querySelector("#next-step-btn");
  const steps = modalOverlay.querySelectorAll(".step");
  const stepPanes = modalOverlay.querySelectorAll(".step-pane");

  // Função para atualizar a UI das etapas
  function updateStepsUI() {
    // Atualizar indicadores de etapa
    steps.forEach((step) => {
      const stepNum = parseInt(step.dataset.step);
      const stepCircle = step.querySelector(".step-circle");

      if (stepNum < currentStep) {
        // Etapa concluída
        stepCircle.classList.remove(
          "bg-gray-300",
          "bg-blue-600",
          "text-gray-600"
        );
        stepCircle.classList.add("bg-green-500", "text-white");
        stepCircle.innerHTML = '<i class="fas fa-check"></i>';
        step.classList.add("completed");
      } else if (stepNum === currentStep) {
        // Etapa atual
        stepCircle.classList.remove(
          "bg-gray-300",
          "bg-green-500",
          "text-gray-600"
        );
        stepCircle.classList.add("bg-blue-600", "text-white");
        stepCircle.textContent = stepNum;
        step.classList.add("active");
      } else {
        // Etapa futura
        stepCircle.classList.remove(
          "bg-blue-600",
          "bg-green-500",
          "text-white"
        );
        stepCircle.classList.add("bg-gray-300", "text-gray-600");
        stepCircle.textContent = stepNum;
        step.classList.remove("active", "completed");
      }
    });

    // Mostrar apenas o painel da etapa atual
    stepPanes.forEach((pane, index) => {
      if (index + 1 === currentStep) {
        pane.classList.remove("hidden");
      } else {
        pane.classList.add("hidden");
      }
    });

    // Atualizar botões de navegação
    if (currentStep === 1) {
      prevBtn.classList.add("hidden");
    } else {
      prevBtn.classList.remove("hidden");
    }

    if (currentStep === totalSteps) {
      nextBtn.classList.add("hidden");
    } else {
      nextBtn.classList.remove("hidden");
      nextBtn.textContent =
        currentStep === totalSteps - 1 ? "Finalizar" : "Continuar";
    }
  }

  // Avançar para a próxima etapa
  function goToNextStep() {
    if (currentStep === 1) {
      // Validar o formulário da primeira etapa
      const form = modalOverlay.querySelector("#checkout-form");
      const nameInput = modalOverlay.querySelector("#customer-name");
      const phoneInput = modalOverlay.querySelector("#customer-phone");

      if (!nameInput.value.trim() || !phoneInput.value.trim()) {
        alert("Por favor, preencha os campos obrigatórios.");
        return;
      }

      // Atualizar resumo do cliente na etapa 2
      const customerInfo = modalOverlay.querySelector("#customer-info-summary");
      const addressValue = modalOverlay
        .querySelector("#customer-address")
        .value.trim();
      const notesValue = modalOverlay
        .querySelector("#customer-notes")
        .value.trim();

      customerInfo.innerHTML = `
        <p><strong>Nome:</strong> ${nameInput.value}</p>
        <p><strong>Telefone:</strong> ${phoneInput.value}</p>
        ${
          addressValue
            ? `<p><strong>Endereço:</strong> ${addressValue}</p>`
            : ""
        }
        ${
          notesValue ? `<p><strong>Observações:</strong> ${notesValue}</p>` : ""
        }
      `;
    }

    if (currentStep === 2) {
      // Preparar WhatsApp link na etapa 3
      const nameValue = modalOverlay
        .querySelector("#customer-name")
        .value.trim();
      const phoneValue = modalOverlay
        .querySelector("#customer-phone")
        .value.trim();
      const addressValue = modalOverlay
        .querySelector("#customer-address")
        .value.trim();
      const notesValue = modalOverlay
        .querySelector("#customer-notes")
        .value.trim();

      // Construir a mensagem para WhatsApp
      let mensagem = "Olá! Gostaria de fazer o seguinte pedido:\n\n";

      // Adicionar cada item do carrinho
      cart.forEach((item) => {
        mensagem += `• ${item.quantity}x ${item.name} - R$ ${(
          item.price * item.quantity
        ).toFixed(2)}\n`;
      });

      // Adicionar total
      const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      mensagem += `\nValor Total: R$ ${total.toFixed(2)}`;
      mensagem += `\n\nNome para contato: ${nameValue}`;
      mensagem += `\nTelefone para contato: ${phoneValue}`;

      if (addressValue) {
        mensagem += `\nEndereço para entrega: ${addressValue}`;
      }

      if (notesValue) {
        mensagem += `\nObservações: ${notesValue}`;
      }

      // Criar o link do WhatsApp
      const whatsappLink = `${
        isMobileDevice() ? "whatsapp://send" : "https://api.whatsapp.com/send"
      }?phone=5591984584521&text=${encodeURIComponent(mensagem)}`;

      const whatsappBtn = modalOverlay.querySelector("#send-whatsapp-btn");
      whatsappBtn.href = whatsappLink;

      // Adicionar evento para limpar o carrinho após enviar
      whatsappBtn.addEventListener("click", () => {
        setTimeout(() => {
          if (confirm("Pedido enviado! Deseja limpar o carrinho?")) {
            cart = [];
            localStorage.setItem("cart", JSON.stringify(cart));
            updateCartUI();
            closeModal();
          }
        }, 1000);
      });
    }

    if (currentStep < totalSteps) {
      currentStep++;
      updateStepsUI();
    }
  }

  // Voltar para a etapa anterior
  function goToPrevStep() {
    if (currentStep > 1) {
      currentStep--;
      updateStepsUI();
    }
  }

  // Fechar o modal
  function closeModal() {
    document.body.removeChild(modalOverlay);
  }

  // Configurar event listeners
  closeBtn.addEventListener("click", closeModal);
  prevBtn.addEventListener("click", goToPrevStep);
  nextBtn.addEventListener("click", goToNextStep);

  // Permitir fechar ao clicar fora do modal
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Inicializar a UI
  updateStepsUI();
}

// Abrir carrinho
function openCart() {
  const cartSidebar = document.getElementById("cart-sidebar");
  const overlay = document.getElementById("overlay");
  if (cartSidebar && overlay) {
    cartSidebar.classList.remove("translate-x-full");
    overlay.classList.remove("invisible");
    overlay.classList.add("opacity-50");
    document.body.classList.add("overflow-hidden");
  }
}

// Fechar carrinho
function closeCartSidebar() {
  const cartSidebar = document.getElementById("cart-sidebar");
  const overlay = document.getElementById("overlay");
  if (cartSidebar && overlay) {
    cartSidebar.classList.add("translate-x-full");
    overlay.classList.add("invisible");
    overlay.classList.remove("opacity-50");
    document.body.classList.remove("overflow-hidden");
  }
}

// Mostrar mensagem de toast (feedback)
function showToast(message) {
  // Verificar se já existe um toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Criar novo toast
  const toast = document.createElement("div");
  toast.className =
    "toast fixed left-1/2 transform -translate-x-1/2 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg z-50";
  toast.textContent = message;
  toast.style.height = "fit-content";

  document.body.appendChild(toast);

  // Animar entrada
  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}

// Função auxiliar para verificar se o dispositivo é móvel
function isMobileDevice() {
  return (
    typeof window.orientation !== "undefined" ||
    navigator.userAgent.indexOf("IEMobile") !== -1
  );
}

// Função para criar botão que abre WhatsApp diretamente na página
function createWhatsAppButton(mensagem, phoneNumber) {
  // Limpar carrinho sidebar
  closeCartSidebar();

  // Criar elemento de overlay
  const whatsappOverlay = document.createElement("div");
  whatsappOverlay.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  // Criar conteúdo do modal
  const modalContent = document.createElement("div");
  modalContent.className = "bg-white p-6 rounded-lg shadow-xl max-w-md w-full";
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Finalizar pedido via WhatsApp</h3>
    <p class="mb-4">Seu pedido está pronto para ser enviado para a Cleber Impressoras.</p>
    <div class="bg-gray-100 p-3 rounded mb-4 max-h-40 overflow-y-auto">
      <pre class="text-sm whitespace-pre-wrap">${mensagem}</pre>
    </div>
    <p class="mb-6">Clique no botão abaixo para abrir o WhatsApp e enviar seu pedido:</p>
    <div class="flex justify-between">
      <button id="cancel-whatsapp" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
        Cancelar
      </button>
      <a href="${
        isMobileDevice() ? "whatsapp://send" : "https://api.whatsapp.com/send"
      }?phone=${phoneNumber}&text=${encodeURIComponent(mensagem)}" 
         target="_blank" 
         class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
        <i class="fab fa-whatsapp mr-2"></i> Abrir WhatsApp
      </a>
    </div>
  `;

  // Adicionar à página
  whatsappOverlay.appendChild(modalContent);
  document.body.appendChild(whatsappOverlay);

  // Adicionar event listener para o botão cancelar
  document.getElementById("cancel-whatsapp").addEventListener("click", () => {
    document.body.removeChild(whatsappOverlay);
  });
  return whatsappOverlay;
}
