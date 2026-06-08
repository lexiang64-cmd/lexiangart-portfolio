const filters = document.querySelectorAll(".filter");
const works = document.querySelectorAll(".work-card");

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
