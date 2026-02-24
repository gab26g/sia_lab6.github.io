const API_URL = "https://fakestoreapi.com/products";

const productsBody = document.getElementById("productsBody");
const statusText = document.getElementById("statusText");
const imageScroller = document.getElementById("imageScroller");
const logoImage = document.querySelector(".logo");

const popup = document.getElementById("popup");
const overlay = document.getElementById("overlay");
const closePopupBtn = document.getElementById("closePopup");

const popupImage = document.getElementById("popupImage");
const popupTitle = document.getElementById("popupTitle");
const popupCategory = document.getElementById("popupCategory");
const popupPrice = document.getElementById("popupPrice");
const popupRating = document.getElementById("popupRating");
const popupDescription = document.getElementById("popupDescription");

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function renderTable(products) {
  if (!Array.isArray(products) || products.length === 0) {
    productsBody.innerHTML =
      '<tr><td colspan="6" class="placeholder">No products found.</td></tr>';
    statusText.textContent = "No data returned from API";
    return;
  }

  productsBody.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${product.id}</td>
      <td>
        <img src="${product.image}" 
             alt="${product.title}" 
             class="table-image">
      </td>
      <td>${product.title}</td>
      <td>${product.category}</td>
      <td>${formatPrice(product.price)}</td>
      <td>${product.rating?.rate ?? "N/A"} (${product.rating?.count ?? 0})</td>
    `;

    row.addEventListener("click", () => showPopup(product));
    productsBody.appendChild(row);
  });

  statusText.textContent = `${products.length} products loaded`;
}

function renderImageScroller(products) {
  if (!Array.isArray(products) || products.length === 0) {
    imageScroller.innerHTML = '<div class="image-placeholder">No product images found.</div>';
    return;
  }

  imageScroller.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "image-card";
    card.setAttribute("title", "Click to view product details");
    card.innerHTML = `
      <img src="${product.image}" alt="${product.title}">
      <p>${product.title}</p>
    `;

    card.addEventListener("click", () => showPopup(product));
    imageScroller.appendChild(card);
  });
}

function showPopup(product) {
  popupImage.src = product.image;
  popupImage.alt = product.title;
  popupTitle.textContent = product.title;
  popupCategory.textContent = product.category;
  popupPrice.textContent = formatPrice(product.price);
  popupRating.textContent = `${product.rating?.rate ?? "N/A"} / 5 (${product.rating?.count ?? 0} reviews)`;
  popupDescription.textContent = product.description;

  popup.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function hidePopup() {
  popup.classList.add("hidden");
  overlay.classList.add("hidden");
}

async function cleanupLogoImage() {
  if (!logoImage || !logoImage.src) {
    return;
  }

  try {
    const sourceImage = new Image();
    sourceImage.src = logoImage.src;
    await sourceImage.decode();

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = sourceImage.width;
    sourceCanvas.height = sourceImage.height;
    const sourceContext = sourceCanvas.getContext("2d");

    if (!sourceContext) {
      return;
    }

    sourceContext.drawImage(sourceImage, 0, 0);
    const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const pixelData = imageData.data;

    const blackThreshold = 36;
    for (let index = 0; index < pixelData.length; index += 4) {
      const red = pixelData[index];
      const green = pixelData[index + 1];
      const blue = pixelData[index + 2];

      if (red <= blackThreshold && green <= blackThreshold && blue <= blackThreshold) {
        pixelData[index + 3] = 0;
      }
    }

    sourceContext.putImageData(imageData, 0, 0);

    const { width, height } = sourceCanvas;
    let top = height;
    let left = width;
    let right = 0;
    let bottom = 0;

    const transparentData = sourceContext.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = transparentData[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }

    if (top >= bottom || left >= right) {
      return;
    }

    const visibleHeight = bottom - top + 1;
    const croppedBottom = top + Math.floor(visibleHeight * 0.63);
    const cropHeight = Math.max(1, croppedBottom - top);
    const cropWidth = right - left + 1;

    const outputCanvas = document.createElement("canvas");
    const padding = 12;
    outputCanvas.width = cropWidth + padding * 2;
    outputCanvas.height = cropHeight + padding * 2;
    const outputContext = outputCanvas.getContext("2d");

    if (!outputContext) {
      return;
    }

    outputContext.drawImage(
      sourceCanvas,
      left,
      top,
      cropWidth,
      cropHeight,
      padding,
      padding,
      cropWidth,
      cropHeight
    );

    logoImage.src = outputCanvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to process logo image:", error);
  }
}

async function loadProducts() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const products = await response.json();
    renderTable(products);
  } catch (error) {
    productsBody.innerHTML = '<tr><td colspan="6" class="placeholder">Failed to load products.</td></tr>';
    imageScroller.innerHTML = '<div class="image-placeholder">Failed to load product images.</div>';
    statusText.textContent = "Error loading data";
    console.error("Failed to fetch products:", error);
  }
}

closePopupBtn.addEventListener("click", hidePopup);
overlay.addEventListener("click", hidePopup);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hidePopup();
  }
});

cleanupLogoImage();
loadProducts();
