const filters = document.querySelectorAll(".filter");
const works = document.querySelectorAll(".work-card");
const previewImages = document.querySelectorAll(".hero-gallery img, .work-card img");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const selected = filter.dataset.filter;

    filters.forEach((item) => {
      const isActive = item === filter;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });

    works.forEach((work) => {
      const shouldShow = selected === "all" || work.dataset.category === selected;
      work.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

function openLightbox(image) {
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = image.alt;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lightboxImage.src = "";
  lightboxImage.alt = "";
  lightboxCaption.textContent = "";
}

previewImages.forEach((image) => {
  image.addEventListener("click", () => openLightbox(image));
});

lightboxClose.addEventListener("click", closeLightbox);
lightboxImage.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
    closeLightbox();
  }
});
