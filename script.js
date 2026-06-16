// URL de la Web App de Google Apps Script de producción
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvH3GOzlx0eHQO1_76Unn8Jwn-I5qAnF8H9z5VgKHEVXhmtwcZ6dKia3dMKN9Pi5Ta/exec";

let localBusinesses = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchBusinesses();
    
    // Escuchar eventos para filtrado en tiempo real
    document.getElementById("search-input").addEventListener("input", filterBusinesses);
    document.getElementById("category-filter").addEventListener("change", filterBusinesses);
});

// Obtener datos desde Google Sheets vía la API Web App
async function fetchBusinesses() {
    const loadingEl = document.getElementById("loading");
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        if (!response.ok) throw new Error("Error de comunicación de red.");
        
        localBusinesses = await response.json();
        loadingEl.style.display = "none";
        renderDirectory(localBusinesses);
    } catch (error) {
        console.error("Error al cargar los datos del catálogo:", error);
        loadingEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> Error al cargar los negocios. Intenta recargar la página.`;
    }
}

// Renderizar las tarjetas dinámicamente en el HTML
function renderDirectory(businesses) {
    const grid = document.getElementById("directory-grid");
    grid.innerHTML = ""; // Limpiar contenedor
    
    if (businesses.length === 0) {
        grid.innerHTML = `<p class="loading-status">No se encontraron negocios que coincidan con tu búsqueda.</p>`;
        return;
    }

    businesses.forEach(business => {
        // Fallback por si el negocio no tiene imagen personalizada
        const imageUrl = business.imagen || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=500&q=80';
        
        // Construir enlace de WhatsApp optimizado para conversión
        const cleanPhone = String(business.whatsapp).replace(/\s+/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola!%20Vi%20tu%20negocio%20en%20el%20catálogo%20de%20Hombre%20de%20Ley%20y%20Digitality.%20Me%20interesa%20más%20información.`;

        const cardHtml = `
            <div class="card">
                <div class="card-image-wrapper">
                    <img src="${imageUrl}" alt="${business.nombre}" class="card-image" loading="lazy">
                    <span class="card-tag">${business.categoria}</span>
                </div>
                <div class="card-body">
                    <h3>${business.nombre}</h3>
                    <p>${business.descripcion}</p>
                    <div class="card-actions">
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                        </a>
                        ${business.ubicacion ? `
                            <a href="${business.ubicacion}" target="_blank" class="btn btn-maps">
                                <i class="fa-solid fa-location-dot"></i> Ubicación
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHtml;
    });
}

// Lógica de filtrado combinado (Buscador por texto + Selector de categorías)
function filterBusinesses() {
    const searchText = document.getElementById("search-input").value.toLowerCase();
    const selectedCategory = document.getElementById("category-filter").value;

    const filtered = localBusinesses.filter(business => {
        const matchesSearch = business.nombre.toLowerCase().includes(searchText) || 
                              business.descripcion.toLowerCase().includes(searchText) ||
                              business.categoria.toLowerCase().includes(searchText);
                              
        const matchesCategory = selectedCategory === "todos" || 
                                business.categoria.toLowerCase() === selectedCategory.toLowerCase();

        return matchesSearch && matchesCategory;
    });

    renderDirectory(filtered);
}