// Endpoint exclusivo proporcionado por el usuario
const API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyvH3GOzlx0eHQO1_76Unn8Jwn-I5qAnF8H9z5VgKHEVXhmtwcZ6dKia3dMKN9Pi5Ta/exec";

document.addEventListener("DOMContentLoaded", () => {
    loadActiveBusinesses();
    
    // Interceptar el evento submit del formulario
    document.getElementById("business-form").addEventListener("submit", handleFormSubmit);
});

// Obtener y listar negocios de la base de datos
async function loadActiveBusinesses() {
    const tableBody = document.getElementById("table-body");
    const loadingSpinner = document.getElementById("loading");
    
    try {
        // Se añade 'redirect: "follow"' para asegurar que el navegador resuelva el redireccionamiento de Google
        const response = await fetch(API_ENDPOINT, {
            method: "GET",
            redirect: "follow"
        });
        
        if (!response.ok) throw new Error("Respuesta de red no satisfactoria.");
        const data = await response.json();
        
        loadingSpinner.style.display = "none";
        tableBody.innerHTML = "";
        
        // Actualizar indicador del panel lateral con la longitud del arreglo
        document.getElementById("total-count").innerText = data.length;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No hay comercios registrados aún.</td></tr>`;
            return;
        }

        data.forEach(business => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${business.nombre || "Sin nombre"}</strong></td>
                <td><span class="badge-tag">${business.categoria || "Otros"}</span></td>
                <td><i class="fa-brands fa-whatsapp" style="color:#25d366"></i> ${business.whatsapp || "N/A"}</td>
                <td><span class="status-active"><i class="fa-solid fa-circle-check"></i> Activo</span></td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error cargando los datos:", error);
        loadingSpinner.innerHTML = `<span style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error al conectar con la base de datos</span>`;
    }
}

// Enviar nuevo negocio vía POST adaptado a las redirecciones de Google Apps Script
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById("submit-btn");
    const originalBtnText = submitBtn.innerHTML;
    
    // Bloquear botón para evitar duplicados en clics rápidos
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Registrando en la nube...`;

    // Recolectar datos del formulario estructurados
    const businessData = {
        nombre: document.getElementById("nombre").value.trim(),
        categoria: document.getElementById("categoria").value,
        whatsapp: document.getElementById("whatsapp").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        ubicacion: document.getElementById("ubicacion").value.trim(),
        imagen: document.getElementById("imagen").value.trim(),
        destacado: "No"
    };

    try {
        // Ejecución del POST con cabecera compatible para saltar CORS Pre-flight drásticos
        await fetch(API_ENDPOINT, {
            method: "POST",
            mode: "no-cors", // Obligatorio por el comportamiento redirect de Google Web Apps
            headers: {
                "Content-Type": "text/plain"
            },
            body: JSON.stringify(businessData)
        });

        // Con mode: 'no-cors' la respuesta es opaca (vacía), asumimos éxito si el fetch no arrojó catch
        showToast("¡Negocio añadido exitosamente!");
        
        // Limpiar el formulario
        document.getElementById("business-form").reset();
        
        // Refrescar tabla de datos locales tras un breve retraso para dar tiempo al guardado
        setTimeout(() => {
            loadActiveBusinesses();
        }, 2000); 

    } catch (error) {
        console.error("Error al guardar negocio:", error);
        showToast("Ocurrió un error al procesar el guardado.");
    } finally {
        // Devolver estado nativo al botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Feedback visual emergente (Toast Alert)
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}