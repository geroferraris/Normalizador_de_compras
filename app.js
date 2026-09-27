
const STORAGE_KEY = "normalizador_v02";

// ==============================
// Utilidades
// ==============================

function parseNumber(value) {
    if (!value) return 0;

    let text = String(value).trim();

    // Formato argentino:
    // 12.450,75 -> 12450.75
    text = text.replace(/\./g, "").replace(",", ".");

    const number = Number(text);

    return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 3
    }).format(value);
}


// ==============================
// Conversiones
// ==============================

const DISTANCE_TO_METERS = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000
};

const WEIGHT_TO_KG = {
    g: 0.001,
    kg: 1
};

const VOLUME_TO_LITERS = {
    ml: 0.001,
    l: 1
};


// ==============================
// Identificación de campos
// ==============================

function getFieldKey(element) {
    const product = element.closest(".product");
    const card = element.closest(".card");

    if (!product || !card) return null;

    const category = card.dataset.category;

    const products = [...card.querySelectorAll(".product")];
    const productIndex = products.indexOf(product);

    const productName = productIndex === 0 ? "A" : "B";

    let field = null;

    if (element.classList.contains("input-packages")) {
        field = "packages";
    }

    else if (element.classList.contains("input-units")) {
        field = "units";
    }

    else if (element.classList.contains("input-content")) {
        field = "content";
    }

    else if (element.classList.contains("input-unit")) {
        field = "unit";
    }

    else if (element.classList.contains("input-price")) {
        field = "price";
    }

    if (!field) return null;

    return `${category}_${productName}_${field}`;
}


// ==============================
// Guardar estado
// ==============================

function saveState() {

    const state = {
        cards: {},
        inputs: {}
    };

    // Estado de las tarjetas
    document.querySelectorAll(".card").forEach(card => {

        const category = card.dataset.category;

        state.cards[category] =
            card.classList.contains("collapsed");
    });


    // Valores de los campos
    document.querySelectorAll("input, select").forEach(element => {

        const key = getFieldKey(element);

        if (!key) return;

        state.inputs[key] = element.value;
    });


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}


// ==============================
// Cargar estado
// ==============================

function loadState() {

    const saved = localStorage.getItem(STORAGE_KEY);


    // --------------------------------
    // Primera ejecución
    // --------------------------------

    if (!saved) {

        // Todas las tarjetas empiezan cerradas
        document.querySelectorAll(".card").forEach(card => {
            card.classList.add("collapsed");
        });

        // Valor inicial
        document.querySelectorAll(".input-packages").forEach(input => {
            input.value = "1";
        });

        saveState();

        return;
    }


    // --------------------------------
    // Leer estado guardado
    // --------------------------------

    let state;

    try {

        state = JSON.parse(saved);

    } catch (error) {

        console.warn(
            "No se pudo leer el estado guardado.",
            error
        );

        localStorage.removeItem(STORAGE_KEY);

        document.querySelectorAll(".card").forEach(card => {
            card.classList.add("collapsed");
        });

        document.querySelectorAll(".input-packages").forEach(input => {
            input.value = "1";
        });

        saveState();

        return;
    }


    // --------------------------------
    // Restaurar tarjetas
    // --------------------------------

    document.querySelectorAll(".card").forEach(card => {

        const category = card.dataset.category;

        if (
            state.cards &&
            state.cards[category] === true
        ) {

            card.classList.add("collapsed");

        } else {

            card.classList.remove("collapsed");
        }
    });


    // --------------------------------
    // Restaurar campos
    // --------------------------------

    document.querySelectorAll("input, select").forEach(element => {

        const key = getFieldKey(element);

        if (!key) return;

        if (
            state.inputs &&
            Object.prototype.hasOwnProperty.call(
                state.inputs,
                key
            )
        ) {

            element.value = state.inputs[key];
        }
    });
}


// ==============================
// Cálculo de una tarjeta
// ==============================

function calculateCard(card) {

    const category = card.dataset.category;

    const products = card.querySelectorAll(".product");


    products.forEach(product => {

        // --------------------------------
        // Datos básicos
        // --------------------------------

        const packages = parseNumber(
            product.querySelector(".input-packages")?.value
        );

        const content = parseNumber(
            product.querySelector(".input-content")?.value
        );

        const price = parseNumber(
            product.querySelector(".input-price")?.value
        );


        // --------------------------------
        // Variables del cálculo
        // --------------------------------

        // Contenido de UN paquete, convertido
        // a la unidad base correspondiente.
        let packageQuantity = 0;

        // Cantidad total que se compra.
        // Se mantiene en la unidad introducida.
        let totalQuantity = 0;

        // Unidad de la cantidad total.
        let quantityUnit = "";

        // Sufijo del precio normalizado.
        let suffix = "";


        // --------------------------------
        // Cantidad
        // --------------------------------

        if (category === "cantidad") {

            packageQuantity = content;

            totalQuantity =
                packages *
                content;

            quantityUnit = "unidades";

            suffix = "/ unidad";
        }


        // --------------------------------
        // Distancia
        // --------------------------------

        else if (category === "distancia") {

            const units = parseNumber(
                product.querySelector(".input-units")?.value
            );

            const unit =
                product.querySelector(".input-unit")?.value;

            // Distancia de una unidad en metros.
            const distanceInMeters =
                content *
                (DISTANCE_TO_METERS[unit] || 1);

            // Distancia de UN paquete en metros.
            packageQuantity =
                units *
                distanceInMeters;

            // Distancia total comprada,
            // manteniendo la unidad introducida.
            totalQuantity =
                packages *
                units *
                content;

            quantityUnit = unit;

            suffix = "/ m";
        }


        // --------------------------------
        // Peso
        // --------------------------------

        else if (category === "peso") {

            const units = parseNumber(
                product.querySelector(".input-units")?.value
            );

            const unit =
                product.querySelector(".input-unit")?.value;

            // Peso de una unidad en kg.
            const weightInKg =
                content *
                (WEIGHT_TO_KG[unit] || 1);

            // Peso de UN paquete en kg.
            packageQuantity =
                units *
                weightInKg;

            // Peso total comprado,
            // manteniendo la unidad introducida.
            totalQuantity =
                packages *
                units *
                content;

            quantityUnit = unit;

            suffix = "/ kg";
        }


        // --------------------------------
        // Volumen
        // --------------------------------

        else if (category === "volumen") {

            const units = parseNumber(
                product.querySelector(".input-units")?.value
            );

            const unit =
                product.querySelector(".input-unit")?.value;

            // Volumen de una unidad en litros.
            const volumeInLiters =
                content *
                (VOLUME_TO_LITERS[unit] || 1);

            // Volumen de UN paquete en litros.
            packageQuantity =
                units *
                volumeInLiters;

            // Volumen total comprado,
            // manteniendo la unidad introducida.
            totalQuantity =
                packages *
                units *
                content;

            quantityUnit = unit;

            suffix = "/ L";
        }


        // --------------------------------
        // Elementos del resultado
        // --------------------------------

        const result =
            product.querySelector(".result-value");

        const totalPriceElement =
            product.querySelector(".total-price");

        const totalQuantityElement =
            product.querySelector(".total-quantity");


        if (!result) return;


        // --------------------------------
        // Cálculos finales
        // --------------------------------

        // Gasto real de todos los paquetes.
        const totalPrice =
            packages *
            price;


        // El precio normalizado utiliza EXCLUSIVAMENTE:
        // precio de UN paquete
        // /
        // contenido de UN paquete.
        if (
            packageQuantity > 0 &&
            price >= 0
        ) {

            const normalizedPrice =
                price /
                packageQuantity;


            // Precio total
            if (totalPriceElement) {

                totalPriceElement.textContent =
                    formatMoney(totalPrice);
            }


            // Cantidad total
            if (totalQuantityElement) {

                totalQuantityElement.textContent =
                    `${formatNumber(totalQuantity)} ${quantityUnit}`;
            }


            // Precio normalizado
            result.textContent =
                `${formatMoney(normalizedPrice)} ${suffix}`;

        } else {

            if (totalPriceElement) {
                totalPriceElement.textContent = "—";
            }

            if (totalQuantityElement) {
                totalQuantityElement.textContent = "—";
            }

            result.textContent = "—";
        }
    });


    // Guardar también los valores
    saveState();
}


// ==============================
// Tarjetas desplegables
// ==============================

document.querySelectorAll(".card-header").forEach(header => {

    header.addEventListener("click", () => {

        const card =
            header.closest(".card");

        card.classList.toggle("collapsed");

        saveState();
    });
});


// ==============================
// Botones Calcular
// ==============================

document.querySelectorAll(".calculate-button").forEach(button => {

    button.addEventListener("click", () => {

        const card =
            button.closest(".card");

        calculateCard(card);
    });
});


// ==============================
// Guardar cambios de campos
// ==============================

document.querySelectorAll("input, select").forEach(element => {

    element.addEventListener("change", () => {
        saveState();
    });
});


// ==============================
// Limpiar
// ==============================

const resetButton =
    document.querySelector("#resetAll");


if (resetButton) {

    resetButton.addEventListener("click", () => {

        const confirmed = confirm(
            "¿Querés borrar los valores guardados y comenzar de nuevo?"
        );

        if (!confirmed) return;

        localStorage.removeItem(STORAGE_KEY);

        location.reload();
    });
}


// ==============================
// Inicio
// ==============================

loadState();
