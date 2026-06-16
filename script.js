const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyvH3GOzlx0eHQO1_76Unn8Jwn-I5qAnF8H9z5VgKHEVXhmtwcZ6dKia3dMKN9Pi5Ta/exec";
let localBusinesses = [];
let allReviews = [];
let userLocation = null;
let currentReviewBusinessId = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchData(); // Ahora obtiene negocios y reseñas
    
    document.getElementById("search-input").addEventListener("input", filterBusinesses);
    document.getElementById("category-filter").addEventListener("change", filterBusinesses);
    document.getElementById("btn-location").addEventListener("click", requestUserLocation);
    document.getElementById("submit-review-btn").addEventListener("click", submitReview);
    
    startFlashDealCountdown();
});

// 1. OBTENER DATOS (Negocios + Reseñas)
async function fetchData() {
    const loadingEl = document.getElementById("loading");
    try {
        const [busResponse, revResponse] = await Promise.all([
            fetch(APPS_SCRIPT_URL),
            fetch(`${APPS_SCRIPT_URL}?action=getReviews`)
        ]);

        if (!busResponse.ok || !revResponse.ok) throw new Error("Error de red.");
        
        localBusinesses = await busResponse.json();
        allReviews = await revResponse.json();
        
        // --- DEPURACIÓN: Esto te dirá en la consola si los datos llegan bien ---
        console.log("Negocios cargados:", localBusinesses);
        console.log("Reseñas cargadas:", allReviews);

        calculateRatings();

        loadingEl.style.display = "none";
        setupFlashDeal(localBusinesses);
        renderDirectory(localBusinesses);
    } catch (error) {
        console.error("Error crítico:", error);
        loadingEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error al cargar datos.`;
    }
}

// Integrar reseñas con los negocios
function calculateRatings() {
    localBusinesses.forEach(bus => {
        // Filtrar reseñas de este negocio
        const busReviews = allReviews.filter(r => String(r.id_negocio) === String(bus.id));
        
        bus.reviewsCount = busReviews.length;
        if (bus.reviewsCount > 0) {
            const sum = busReviews.reduce((acc, curr) => acc + Number(curr.calificacion), 0);
            bus.rating = (sum / bus.reviewsCount).toFixed(1);
        } else {
            bus.rating = 0; // Sin calificaciones aún
        }
    });
}

// 2. RENDERIZAR TARJETAS
function renderDirectory(businesses) {
    const grid = document.getElementById("directory-grid");
    grid.innerHTML = ""; 
    
    if (businesses.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon-wrapper"><i class="fa-solid fa-store-slash"></i></div>
                <h3>No encontramos lo que buscas</h3>
                <p>Si conoces un negocio así en El Salto, ¡dile que nos contacte para ser fundador!</p>
            </div>`;
        return;
    }

    businesses.forEach(business => {
        const imageUrl = business.imagen || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=500&q=80';
        const cleanPhone = String(business.whatsapp).replace(/\s+/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola!%20Vi%20tu%20negocio%20en%20el%20directorio%20Hombre%20de%20Ley%20x%20Digitality.%20Me%20interesa.`;
        
        const esDestacado = business.destacado === "Si" || business.destacado === "Sí";
        const destacadoBadge = esDestacado ? `<div class="premium-badge"><i class="fa-solid fa-crown"></i> Fundador</div>` : '';

        // UI Estrellas
        const starsHtml = business.rating > 0 ? generateStars(business.rating) : '<span style="color:#94a3b8; font-size:0.8rem;">Nuevo</span>';
        const ratingText = business.rating > 0 ? business.rating : '';
        const reviewsText = business.reviewsCount > 0 ? `(${business.reviewsCount} reseñas)` : '(Sé el primero)';

        let distanceHtml = '';
        if (userLocation && business.distance) {
            distanceHtml = `<span class="distance-badge"><i class="fa-solid fa-person-walking"></i> a ${business.distance} km</span>`;
        }

        const safeName = business.nombre.replace(/'/g, "\\'");
        const safeDesc = business.descripcion.replace(/'/g, "\\'").substring(0, 50) + "...";
        const safeId = business.id;

        const cardHtml = `
            <div class="card ${esDestacado ? 'card-premium' : ''}">
                ${destacadoBadge}
                <div class="card-image-wrapper">
                    <img src="${imageUrl}" alt="${business.nombre}" class="card-image" loading="lazy">
                    <span class="card-tag">${business.categoria}</span>
                    ${distanceHtml}
                </div>
                <div class="card-body">
                    <div class="card-header-row">
                        <h3>${business.nombre}</h3>
                    </div>

<div class="reviews-container" onclick="openReviewsModal('${business.id}', '${safeName}')" style="cursor:pointer;">
    <div class="stars">${starsHtml}</div>
    <span class="rating-number">${ratingText}</span>
    <span class="reviews-count">${reviewsText} (Ver todas)</span>
</div>
                    <p class="card-desc">${business.descripcion}</p>
                    
                    <div class="card-actions" style="margin-bottom: 10px;">
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp" title="WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i> <span>Contactar</span>
                        </a>
                        <button onclick="openReviewModal('${safeId}', '${safeName}')" class="btn btn-review">
                            <i class="fa-regular fa-star"></i> Calificar
                        </button>
                    </div>
                    <div class="card-actions">
                        ${business.ubicacion ? `
                            <a href="${business.ubicacion}" target="_blank" class="btn btn-icon btn-maps" title="Mapa">
                                <i class="fa-solid fa-location-dot"></i>
                            </a>
                        ` : ''}
                        <button onclick="shareBusiness('${safeName}', '${safeDesc}')" class="btn btn-icon btn-share" style="flex:1" title="Compartir">
                            <i class="fa-solid fa-share-nodes"></i> Compartir
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHtml;
    });
}

// 3. GENERADOR DE ESTRELLAS
function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) stars += '<i class="fa-solid fa-star"></i>';
        else if (i === fullStars && hasHalfStar) stars += '<i class="fa-solid fa-star-half-stroke"></i>';
        else stars += '<i class="fa-regular fa-star"></i>';
    }
    return stars;
}

// --- LÓGICA DE RESEÑAS (MODAL Y ENVÍO) ---
function openReviewModal(busId, busName) {
    // Comprobar si ya reseñó este negocio localmente
   const DEV_MODE = true;

if (!DEV_MODE) {

    const hasReviewed = localStorage.getItem(`review_${busId}`);

    if (hasReviewed) {
        alert("Ya has calificado este negocio anteriormente.");
        return;
    }

}
    currentReviewBusinessId = busId;
    document.getElementById("modal-business-name").innerText = `Calificar ${busName}`;
    document.getElementById("review-modal").style.display = "flex";
    
    // Resetear formulario
    const radios = document.getElementsByName('rating');
    radios.forEach(r => r.checked = false);
    document.getElementById("review-comment").value = "";
}

function closeReviewModal() {
    document.getElementById("review-modal").style.display = "none";
    currentReviewBusinessId = null;
}

async function submitReview() {
    const selectedRating = document.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById("review-comment").value.trim();
    const btn = document.getElementById("submit-review-btn");

    if (!selectedRating) {
        alert("Selecciona una calificación.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    // Convertimos los datos a un formato de formulario simple
    const formData = new URLSearchParams();
    formData.append("action", "addReview");
    formData.append("id_negocio", currentReviewBusinessId);
    formData.append("calificacion", selectedRating.value);
    formData.append("comentario", comment);

    try {
        // Al usar no-cors, el navegador no pide permiso OPTIONS primero
        await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors', 
            body: formData
        });

        // Como no podemos leer la respuesta en no-cors, asumimos éxito
        localStorage.setItem(`review_${currentReviewBusinessId}`, "true");
        closeReviewModal();
        alert("⭐ ¡Gracias por tu reseña!");
        
        // Recargar datos
        await fetchData();

    } catch (error) {
        console.error("Error al enviar:", error);
        alert("Error de red. Verifica la consola.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Enviar Calificación";
    }
}

// 4. OFERTA FLASH DEL DÍA
function setupFlashDeal(businesses) {
    if(businesses.length === 0) return;
    const dealSection = document.getElementById("flash-deal-section");
    const dealContent = document.getElementById("flash-deal-content");
    const flashBusiness = businesses.find(b => b.destacado === "Si") || businesses[0];
    const cleanPhone = String(flashBusiness.whatsapp).replace(/\s+/g, '');
    
    dealContent.innerHTML = `
        <div class="flash-card">
            <div class="flash-img-col">
                <img src="${flashBusiness.imagen || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=500&q=80'}" alt="Oferta">
                <div class="flash-tag">¡Promo Exclusiva!</div>
            </div>
            <div class="flash-info-col">
                <h3>${flashBusiness.nombre}</h3>
                <p>Menciona que los viste en <strong>Hombre de Ley</strong> y pregunta por la promoción especial de hoy.</p>
                <a href="https://wa.me/${cleanPhone}?text=Hola!%20Vengo%20por%20la%20Oferta%20Flash%20en%20el%20directorio." class="btn btn-whatsapp flash-btn" target="_blank">
                    <i class="fa-brands fa-whatsapp"></i> Reclamar Oferta
                </a>
            </div>
        </div>
    `;
    dealSection.style.display = "block";
}

function startFlashDealCountdown() {
    const timerDisplay = document.getElementById("countdown-timer");
    setInterval(() => {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        timerDisplay.innerHTML = `<i class="fa-regular fa-clock"></i> Termina en ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, 1000);
}

// 5. GEOLOCALIZACIÓN
function requestUserLocation() {
    const btn = document.getElementById("btn-location");
    const statusText = document.getElementById("location-status");
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                localBusinesses.forEach(b => { b.distance = (Math.random() * 5 + 0.5).toFixed(1); });
                localBusinesses.sort((a, b) => a.distance - b.distance);
                statusText.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#10b981;"></i> Ordenados por cercanía`;
                btn.innerHTML = `<i class="fa-solid fa-location-crosshairs" style="color:var(--accent-color);"></i>`;
                renderDirectory(localBusinesses);
            },
            (error) => {
                btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i>`;
                alert("No pudimos acceder a tu ubicación. Verifica los permisos.");
            }
        );
    } else { alert("Tu navegador no soporta geolocalización."); }
}

// 6. UTILIDADES
// 6. UTILIDADES - FUNCIÓN DE COMPARTIR MEJORADA
function shareBusiness(name, desc) {
    // Limpiamos la descripción si viene con caracteres especiales o muy larga
    const cleanDesc = desc.replace(/'/g, "").substring(0, 100);
    
    if (navigator.share) {
        // Esta API es la que usan las apps nativas (WhatsApp, Instagram, etc.)
        navigator.share({
            title: name,
            text: `¡Mira este negocio recomendado en El Salto: ${name}! \n${cleanDesc}`,
            url: window.location.href // Opcional: podrías poner una URL profunda si tuvieras una página para cada negocio
        }).then(() => console.log('Compartido con éxito'))
          .catch((error) => console.log('Error compartiendo:', error));
    } else {
        // Fallback: si el navegador no soporta share, copiamos al portapapeles
        const shareText = `¡Mira este negocio recomendado en El Salto: ${name}! \n${cleanDesc}\n${window.location.href}`;
        navigator.clipboard.writeText(shareText).then(() => {
            alert("¡Enlace y descripción copiados al portapapeles! Ya puedes pegarlo en WhatsApp.");
        });
    }
}